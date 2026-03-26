import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocket } from 'ws';

interface DocEntry {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}

const docs = new Map<string, DocEntry>();

const messageSync = 0;
const messageAwareness = 1;

export function getOrCreateDoc(docName: string): DocEntry {
  let entry = docs.get(docName);
  if (!entry) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    entry = { doc, awareness, conns: new Map() };
    docs.set(docName, entry);
  }
  return entry;
}

export function handleConnection(ws: WebSocket, docName: string, isReadOnly: boolean): void {
  const entry = getOrCreateDoc(docName);
  const { doc, awareness, conns } = entry;
  const controlledIds = new Set<number>();
  conns.set(ws, controlledIds);

  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));

  // Send current awareness states
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
    );
    ws.send(encoding.toUint8Array(enc));
  }

  ws.on('message', (data: Buffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        if (isReadOnly) return; // Drop sync messages from viewers
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageSync);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, enc, doc, null);
        if (encoding.length(enc) > 1) {
          ws.send(encoding.toUint8Array(enc));
        }
        // Broadcast update to other clients after a full sync (type 2 = update)
        if (syncMessageType === 2) {
          const update = Y.encodeStateAsUpdate(doc);
          broadcastUpdate(docName, ws, update);
        }
      } else if (messageType === messageAwareness) {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(awareness, Array.from(controlledIds), null);
    if (conns.size === 0) {
      // Last client disconnected — clean up doc to prevent memory leaks
      awareness.destroy();
      doc.destroy();
      docs.delete(docName);
      console.log(`[WS] Doc ${docName} removed from memory (no remaining connections)`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] WebSocket error for ${docName}:`, err);
  });

  // Broadcast awareness changes to all other connected clients
  const awarenessHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    _origin: unknown
  ) => {
    const changedClients = added.concat(updated, removed);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const msg = encoding.toUint8Array(enc);
    conns.forEach((_, conn) => {
      if (conn !== ws && conn.readyState === WebSocket.OPEN) {
        conn.send(msg);
      }
    });
  };
  awareness.on('update', awarenessHandler);
}

function broadcastUpdate(docName: string, origin: WebSocket, update: Uint8Array): void {
  const entry = docs.get(docName);
  if (!entry) return;
  entry.conns.forEach((_, conn) => {
    if (conn !== origin && conn.readyState === WebSocket.OPEN) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageSync);
      syncProtocol.writeUpdate(enc, update);
      conn.send(encoding.toUint8Array(enc));
    }
  });
}
