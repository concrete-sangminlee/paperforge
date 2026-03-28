import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { authenticateFromCookie } from './auth';
import { getProjectRole } from './authorization';
import { handleConnection } from './yjs-server';

const PORT = parseInt(process.env.WS_PORT || '4001', 10);
const MAX_CONNECTIONS_PER_USER = 20;
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB
const PING_INTERVAL = 30_000; // 30s

// Track connections per user for rate limiting
const userConnectionCount = new Map<string, number>();

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'paperforge-ws' }));
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_SIZE });

wss.on('error', (err) => {
  console.error('[WS] Server error:', err);
});

server.on('upgrade', async (req, socket, head) => {
  try {
    // Parse projectId from URL: /ws/:projectId
    const url = req.url || '';
    const match = url.match(/^\/ws\/([^/?]+)/);
    if (!match) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const projectId = decodeURIComponent(match[1]);

    // Validate projectId format (UUID)
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // Authenticate from httpOnly cookie
    const user = authenticateFromCookie(req);
    if (!user || !user.id) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Per-user connection limit
    const currentCount = userConnectionCount.get(user.id) ?? 0;
    if (currentCount >= MAX_CONNECTIONS_PER_USER) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }

    // Check project membership
    const role = await getProjectRole(projectId, user.id);
    if (!role) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    const isReadOnly = role === 'viewer';

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      // Track connection
      userConnectionCount.set(user.id, (userConnectionCount.get(user.id) ?? 0) + 1);
      (ws as WebSocket & { _userId?: string })._userId = user.id;

      wss.emit('connection', ws, req, projectId, isReadOnly);
    });
  } catch (err) {
    console.error('[WS] Upgrade error:', err);
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, projectId: string, isReadOnly: boolean) => {
  handleConnection(ws, projectId, isReadOnly);

  ws.on('close', () => {
    const userId = (ws as WebSocket & { _userId?: string })._userId;
    if (userId) {
      const count = (userConnectionCount.get(userId) ?? 1) - 1;
      if (count <= 0) userConnectionCount.delete(userId);
      else userConnectionCount.set(userId, count);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
  });
});

// Ping/pong keepalive to detect dead connections
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if ((ws as WebSocket & { isAlive?: boolean }).isAlive === false) {
      ws.terminate();
      return;
    }
    (ws as WebSocket & { isAlive?: boolean }).isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

wss.on('connection', (ws) => {
  (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
  ws.on('pong', () => { (ws as WebSocket & { isAlive?: boolean }).isAlive = true; });
});

server.listen(PORT, () => {
  console.log(`[WS] PaperForge WebSocket server listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('[WS] Shutting down gracefully...');
  clearInterval(pingInterval);
  wss.clients.forEach((ws) => ws.close(1001, 'Server shutting down'));
  wss.close(() => {
    server.close(() => {
      console.log('[WS] Server closed');
      process.exit(0);
    });
  });
  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
