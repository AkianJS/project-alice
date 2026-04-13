import { Component, Show } from 'solid-js';
import type { Session } from '../../lib/types';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

const statusDotColor: Record<string, string> = {
  running: 'var(--color-status-running)',
  stopped: 'var(--color-status-stopped)',
  finished: 'var(--color-status-finished)',
};

const SessionItem: Component<SessionItemProps> = (props) => {
  return (
    <>
      <style>{`
        .session-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          cursor: pointer;
          border-left: 2px solid transparent;
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          user-select: none;
          transition: background-color 0.1s;
        }
        .session-item:hover {
          background-color: var(--color-bg-elevated);
        }
        .session-item.active {
          background-color: var(--color-bg-tertiary);
          border-left-color: var(--color-accent);
          color: var(--color-text-primary);
        }
        .session-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .session-branch-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .session-missing-icon {
          flex-shrink: 0;
          color: var(--color-warning, #f59e0b);
          font-size: var(--font-size-sm);
          cursor: default;
        }
      `}</style>
      <div
        class={`session-item${props.isActive ? ' active' : ''}`}
        onClick={props.onClick}
        onContextMenu={props.onContextMenu}
      >
        <span
          class="session-status-dot"
          style={{ 'background-color': statusDotColor[props.session.status] ?? 'var(--color-text-muted)' }}
        />
        <span class="session-branch-name">{props.session.branchName}</span>
        <Show when={props.session.worktreeExists === false}>
          <span
            class="session-missing-icon"
            title="Worktree directory is missing — the session may be orphaned"
          >
            ⚠
          </span>
        </Show>
      </div>
    </>
  );
};

export default SessionItem;
