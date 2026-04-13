import { Component, For, Show } from 'solid-js';
import { sessionState, updateStatus } from '../../stores/sessionStore';
import {
  addTab,
  removeTab,
  setActiveTab,
  getTabsForSession,
  getActiveTabForSession,
} from '../../stores/terminalStore';
import type { Tab } from '../../stores/terminalStore';
import TabBar from './TabBar';
import TerminalTab from './TerminalTab';

function generateId(): string {
  return crypto.randomUUID();
}

function createNewTab(sessionId: string): void {
  const id = generateId();
  const tab: Tab = { id, sessionId, title: 'bash' };
  addTab(sessionId, tab);
}

const TerminalArea: Component = () => {
  const activeSessionId = () => sessionState.activeSessionId;

  const tabs = () => {
    const id = activeSessionId();
    if (!id) return [];
    return getTabsForSession(id);
  };

  const activeTabId = () => {
    const id = activeSessionId();
    if (!id) return null;
    return getActiveTabForSession(id);
  };

  const activeSession = () =>
    sessionState.sessions.find((s) => s.id === activeSessionId()) ?? null;

  const handleNew = () => {
    const session = activeSession();
    if (!session || session.status === 'finished') return;
    createNewTab(session.id);
  };

  const handleSelect = (tabId: string) => {
    const id = activeSessionId();
    if (!id) return;
    setActiveTab(id, tabId);
  };

  const handleClose = (tabId: string) => {
    const id = activeSessionId();
    if (!id) return;
    removeTab(id, tabId);
    const remaining = getTabsForSession(id);
    if (remaining.length === 0) {
      updateStatus(id, 'stopped').catch(() => {});
    }
  };

  return (
    <>
      <style>{`
        .terminal-area {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
          background-color: var(--color-bg-primary);
        }
        .terminal-area-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
          text-align: center;
          padding: var(--spacing-xl);
        }
        .terminal-tabs-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .terminal-tab-wrapper {
          position: absolute;
          inset: 0;
        }
      `}</style>
      <div class="terminal-area">
        <Show
          when={activeSessionId() && tabs().length > 0}
          fallback={
            <div class="terminal-area-empty">
              {activeSessionId()
                ? 'No active terminals. Press Ctrl+T to open one.'
                : 'Select a session to get started.'}
            </div>
          }
        >
          <TabBar
            tabs={tabs()}
            activeTabId={activeTabId()}
            onSelect={handleSelect}
            onClose={handleClose}
            onNew={handleNew}
          />
          <div class="terminal-tabs-container">
            <For each={tabs()}>
              {(tab) => {
                const session = activeSession();
                return (
                  <div class="terminal-tab-wrapper">
                    <TerminalTab
                      tabId={tab.id}
                      sessionId={tab.sessionId}
                      cwd={session?.worktreePath ?? ''}
                      isVisible={tab.id === activeTabId()}
                    />
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </>
  );
};

export default TerminalArea;
