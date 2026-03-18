import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { authenticateFromCookie } from './auth';
import { getProjectRole } from './authorization';
import { handleConnection } from './yjs-server';

const PORT = parseInt(process.env.WS_PORT || '4001', 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PaperForge WebSocket Server\n');
});

const wss = new WebSocketServer({ noServer: true });

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

    // Authenticate from httpOnly cookie
    const user = authenticateFromCookie(req);
    if (!user || !user.id) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
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
      wss.emit('connection', ws, req, projectId, isReadOnly);
    });
  } catch (err) {
    console.error('Upgrade error:', err);
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, projectId: string, isReadOnly: boolean) => {
  console.log(`[WS] Client connected to project ${projectId} (readOnly=${isReadOnly})`);
  handleConnection(ws, projectId, isReadOnly);

  ws.on('close', () => {
    console.log(`[WS] Client disconnected from project ${projectId}`);
  });
});

server.listen(PORT, () => {
  console.log(`[WS] PaperForge WebSocket server listening on port ${PORT}`);
});
