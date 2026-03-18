'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CollaboratorState {
  clientId: number;
  name: string;
  color: string;
}

interface CollaboratorsProps {
  provider: WebsocketProvider;
}

/**
 * Displays colored avatar dots for each connected collaborator, derived from
 * Yjs awareness states shared by the WebSocket provider.
 */
export function Collaborators({ provider }: CollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;

    function update() {
      const states = awareness.getStates();
      const list: CollaboratorState[] = [];
      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip self
        const user = state.user as { name?: string; color?: string } | undefined;
        if (user) {
          list.push({
            clientId,
            name: user.name || 'Anonymous',
            color: user.color || '#6b7280',
          });
        }
      });
      setCollaborators(list);
    }

    awareness.on('change', update);
    update();

    return () => {
      awareness.off('change', update);
    };
  }, [provider]);

  if (collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-1" aria-label="Online collaborators">
      {collaborators.map(({ clientId, name, color }) => (
        <span
          key={clientId}
          title={name}
          className="inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-background"
          style={{ backgroundColor: color }}
          aria-label={name}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      ))}
    </div>
  );
}
