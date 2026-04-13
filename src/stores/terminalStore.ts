import { createStore } from 'solid-js/store';

export interface Tab {
  id: string;
  sessionId: string;
  title: string;
}

interface TerminalState {
  tabsBySession: Record<string, Tab[]>;
  activeTabBySession: Record<string, string | null>;
}

const [state, setState] = createStore<TerminalState>({
  tabsBySession: {},
  activeTabBySession: {},
});

export { state as terminalState };

export function addTab(sessionId: string, tab: Tab): void {
  setState('tabsBySession', sessionId, (prev) => [...(prev ?? []), tab]);
  setState('activeTabBySession', sessionId, tab.id);
}

export function removeTab(sessionId: string, tabId: string): void {
  setState('tabsBySession', sessionId, (prev) => (prev ?? []).filter((t) => t.id !== tabId));
  const remaining = state.tabsBySession[sessionId] ?? [];
  if (state.activeTabBySession[sessionId] === tabId) {
    setState('activeTabBySession', sessionId, remaining.length > 0 ? remaining[remaining.length - 1].id : null);
  }
}

export function setActiveTab(sessionId: string, tabId: string): void {
  setState('activeTabBySession', sessionId, tabId);
}

export function getTabsForSession(sessionId: string): Tab[] {
  return state.tabsBySession[sessionId] ?? [];
}

export function getActiveTabForSession(sessionId: string): string | null {
  return state.activeTabBySession[sessionId] ?? null;
}

export function clearSession(sessionId: string): void {
  setState('tabsBySession', sessionId, []);
  setState('activeTabBySession', sessionId, null);
}
