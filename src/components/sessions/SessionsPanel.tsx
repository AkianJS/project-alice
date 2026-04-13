import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { sessionState, loadSessions, addSession, removeSession, setActiveSession, updateStatus } from '../../stores/sessionStore';
import type { Session } from '../../lib/types';
import SessionItem from './SessionItem';
import NewSessionDialog from './NewSessionDialog';
import DeleteSessionDialog from './DeleteSessionDialog';
import ContextMenu, { MenuItem } from '../shared/ContextMenu';

const SessionsPanel: Component = () => {
  const [newDialogOpen, setNewDialogOpen] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<Session | null>(null);
  const [contextMenu, setContextMenu] = createSignal<{
    x: number;
    y: number;
    session: Session;
  } | null>(null);

  onMount(() => {
    loadSessions();
  });

  const handleContextMenu = (e: MouseEvent, session: Session) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, session });
  };

  const closeContextMenu = () => setContextMenu(null);

  const contextMenuItems = (): MenuItem[] => {
    const session = contextMenu()?.session;
    if (!session) return [];
    return [
      {
        label: 'Mark as Finished',
        onClick: () => updateStatus(session.id, 'finished'),
        disabled: session.status === 'finished',
      },
      {
        label: 'Delete',
        onClick: () => {
          setDeleteTarget(session);
        },
      },
    ];
  };

  const handleAddSession = async (branchName: string) => {
    await addSession(branchName);
    setNewDialogOpen(false);
  };

  const handleDelete = async (deleteWorktree: boolean) => {
    const target = deleteTarget();
    if (!target) return;
    await removeSession(target.id, deleteWorktree);
    setDeleteTarget(null);
  };

  return (
    <>
      <style>{`
        .sessions-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .sessions-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sessions-list::-webkit-scrollbar {
          width: 6px;
        }
        .sessions-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .sessions-list::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }
        .sessions-new-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          border-top: 1px solid var(--color-border);
          background-color: transparent;
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
          cursor: pointer;
          text-align: left;
          flex-shrink: 0;
        }
        .sessions-new-btn:hover {
          background-color: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }
        .sessions-empty {
          padding: var(--spacing-lg) var(--spacing-md);
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
          text-align: center;
          line-height: 1.6;
        }
      `}</style>

      <div class="sessions-panel">
        <div class="panel-header">Sessions</div>
        <div class="sessions-list">
          <Show
            when={sessionState.sessions.length > 0}
            fallback={
              <div class="sessions-empty">
                No sessions yet. Click + New Session to get started.
              </div>
            }
          >
            <For each={sessionState.sessions}>
              {(session) => (
                <SessionItem
                  session={session}
                  isActive={sessionState.activeSessionId === session.id}
                  onClick={() => setActiveSession(session.id)}
                  onContextMenu={(e) => handleContextMenu(e, session)}
                />
              )}
            </For>
          </Show>
        </div>
        <button class="sessions-new-btn" onClick={() => setNewDialogOpen(true)}>
          + New Session
        </button>
      </div>

      <NewSessionDialog
        isOpen={newDialogOpen()}
        onClose={() => setNewDialogOpen(false)}
        onSubmit={handleAddSession}
      />

      <DeleteSessionDialog
        isOpen={deleteTarget() !== null}
        sessionName={deleteTarget()?.branchName ?? ''}
        onClose={() => setDeleteTarget(null)}
        onDelete={handleDelete}
      />

      <ContextMenu
        isOpen={contextMenu() !== null}
        position={contextMenu() ?? { x: 0, y: 0 }}
        items={contextMenuItems()}
        onClose={closeContextMenu}
      />
    </>
  );
};

export default SessionsPanel;
