import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import {
  handleConnection,
  getOrCreateDoc,
  getCollabMetrics,
} from '../../websocket/src/yjs-server';

type Handler = (...args: unknown[]) => void;

/** Minimal stand-in for a `ws` WebSocket exercising only what the server uses. */
function fakeWs() {
  const handlers: Record<string, Handler> = {};
  return {
    sent: [] as unknown[],
    readyState: 1, // WebSocket.OPEN
    send(data: unknown) {
      this.sent.push(data);
    },
    on(event: string, cb: Handler) {
      handlers[event] = cb;
    },
    emit(event: string, ...args: unknown[]) {
      handlers[event]?.(...args);
    },
  };
}

/** Build a Yjs sync "update" protocol message carrying a text insertion. */
function buildUpdateMessage(text: string): Buffer {
  const tmp = new Y.Doc();
  tmp.getText('t').insert(0, text);
  const update = Y.encodeStateAsUpdate(tmp);
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, 0); // messageSync
  syncProtocol.writeUpdate(enc, update);
  return Buffer.from(encoding.toUint8Array(enc));
}

describe('yjs-server connection lifecycle + metrics', () => {
  it('tracks documents and connections and cleans up the doc when the last client leaves', () => {
    const docA = `doc-A-${Math.random().toString(36).slice(2)}`;
    const docB = `doc-B-${Math.random().toString(36).slice(2)}`;

    const a1 = fakeWs();
    const a2 = fakeWs();
    const b1 = fakeWs();

    handleConnection(a1 as never, docA, false);
    handleConnection(a2 as never, docA, false);
    handleConnection(b1 as never, docB, false);

    let metrics = getCollabMetrics();
    expect(metrics.perDocument.find((d) => d.docName === docA)?.connections).toBe(2);
    expect(metrics.perDocument.find((d) => d.docName === docB)?.connections).toBe(1);

    // Each new client receives an initial sync step.
    expect(a1.sent.length).toBeGreaterThanOrEqual(1);

    // One A client leaves → doc A still has one connection.
    a1.emit('close');
    metrics = getCollabMetrics();
    expect(metrics.perDocument.find((d) => d.docName === docA)?.connections).toBe(1);

    // Last A client leaves → doc A is removed from memory.
    a2.emit('close');
    metrics = getCollabMetrics();
    expect(metrics.perDocument.find((d) => d.docName === docA)).toBeUndefined();

    // Cleanup doc B too.
    b1.emit('close');
    expect(getCollabMetrics().perDocument.find((d) => d.docName === docB)).toBeUndefined();
  });
});

describe('yjs-server viewer write-block', () => {
  it('drops sync writes from a viewer but applies and broadcasts editor writes', () => {
    const docName = `doc-rw-${Math.random().toString(36).slice(2)}`;
    const editor = fakeWs();
    const viewer = fakeWs();

    handleConnection(editor as never, docName, false); // read-write
    handleConnection(viewer as never, docName, true); // read-only

    const editorSetupSends = editor.sent.length;
    const viewerSetupSends = viewer.sent.length;

    // Viewer attempts a write → dropped: server doc unchanged, no broadcast.
    viewer.emit('message', buildUpdateMessage('from-viewer'));
    expect(getOrCreateDoc(docName).doc.getText('t').toString()).toBe('');
    expect(editor.sent.length).toBe(editorSetupSends); // editor received no broadcast

    // Editor writes → applied to the server doc and broadcast to the viewer.
    editor.emit('message', buildUpdateMessage('from-editor'));
    expect(getOrCreateDoc(docName).doc.getText('t').toString()).toBe('from-editor');
    expect(viewer.sent.length).toBe(viewerSetupSends + 1); // viewer received the broadcast

    // Cleanup.
    editor.emit('close');
    viewer.emit('close');
  });
});
