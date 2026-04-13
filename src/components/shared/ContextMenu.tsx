import { Component, createEffect, For, onCleanup, Show } from 'solid-js';

export interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: Component<ContextMenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;

  const clampedPosition = () => {
    const MENU_W = 180;
    const MENU_H = props.items.length * 32 + 8;
    const x = Math.min(props.position.x, window.innerWidth - MENU_W - 4);
    const y = Math.min(props.position.y, window.innerHeight - MENU_H - 4);
    return { x: Math.max(0, x), y: Math.max(0, y) };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  createEffect(() => {
    if (props.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <style>{`
        .context-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1999;
        }
        .context-menu {
          position: fixed;
          z-index: 2000;
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) 0;
          min-width: 160px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .context-menu-item {
          display: flex;
          align-items: center;
          padding: var(--spacing-xs) var(--spacing-md);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          cursor: pointer;
          height: 32px;
          box-sizing: border-box;
        }
        .context-menu-item:hover:not(.disabled) {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
        }
        .context-menu-item.disabled {
          color: var(--color-text-muted);
          cursor: not-allowed;
        }
      `}</style>
      <Show when={props.isOpen}>
        <div class="context-menu-backdrop" onClick={props.onClose} />
        <div
          ref={menuRef}
          class="context-menu"
          style={{
            left: `${clampedPosition().x}px`,
            top: `${clampedPosition().y}px`,
          }}
        >
          <For each={props.items}>
            {(item) => (
              <div
                class={`context-menu-item${item.disabled ? ' disabled' : ''}`}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    props.onClose();
                  }
                }}
              >
                {item.label}
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

export default ContextMenu;
