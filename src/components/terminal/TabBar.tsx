import { Component, For } from 'solid-js';
import type { Tab } from '../../stores/terminalStore';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

const TabBar: Component<TabBarProps> = (props) => {
  return (
    <>
      <style>{`
        .tab-bar {
          display: flex;
          align-items: center;
          background-color: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          overflow-x: auto;
          flex-shrink: 0;
          height: 34px;
        }
        .tab-bar::-webkit-scrollbar {
          height: 4px;
        }
        .tab-bar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 2px;
        }
        .tab-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 var(--spacing-md);
          height: 100%;
          cursor: pointer;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          border-right: 1px solid var(--color-border);
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          flex-shrink: 0;
          user-select: none;
        }
        .tab-item:hover {
          color: var(--color-text-primary);
          background-color: var(--color-bg-elevated);
        }
        .tab-item.active {
          color: var(--color-text-primary);
          border-bottom-color: var(--color-accent);
          background-color: var(--color-bg-primary);
        }
        .tab-close {
          display: none;
          border: none;
          background: none;
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: var(--font-size-md);
          line-height: 1;
          padding: 0 2px;
          border-radius: var(--radius-sm);
        }
        .tab-item:hover .tab-close,
        .tab-item.active .tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tab-close:hover {
          color: var(--color-text-primary);
          background-color: var(--color-border);
        }
        .tab-new-btn {
          border: none;
          background: none;
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: var(--font-size-lg);
          padding: 0 var(--spacing-sm);
          height: 100%;
          flex-shrink: 0;
        }
        .tab-new-btn:hover {
          color: var(--color-text-primary);
          background-color: var(--color-bg-elevated);
        }
      `}</style>
      <div class="tab-bar">
        <For each={props.tabs}>
          {(tab) => (
            <div
              class={`tab-item${tab.id === props.activeTabId ? ' active' : ''}`}
              onClick={() => props.onSelect(tab.id)}
            >
              <span>{tab.title}</span>
              <button
                class="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onClose(tab.id);
                }}
                title="Close tab"
              >
                ×
              </button>
            </div>
          )}
        </For>
        <button class="tab-new-btn" onClick={props.onNew} title="New tab (Ctrl+T)">
          +
        </button>
      </div>
    </>
  );
};

export default TabBar;
