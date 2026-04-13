import { createStore } from 'solid-js/store';
import type { Session, SessionStatus } from '../lib/types';
import { createSession as apiCreateSession, deleteSession as apiDeleteSession, listSessions as apiListSessions, updateSessionStatus as apiUpdateSessionStatus } from '../lib/tauri';
import { addTab } from './terminalStore';
import type { Tab } from './terminalStore';

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
}

const [state, setState] = createStore<SessionState>({
  sessions: [],
  activeSessionId: null,
});

export { state as sessionState };

export const activeSession = () =>
  state.sessions.find((s) => s.id === state.activeSessionId) ?? null;

export async function loadSessions(): Promise<void> {
  const sessions = await apiListSessions();
  setState('sessions', sessions);
}

export async function addSession(branchName: string): Promise<void> {
  const session = await apiCreateSession(branchName);
  setState('sessions', (prev) => [...prev, session]);
  setState('activeSessionId', session.id);
  const tab: Tab = { id: crypto.randomUUID(), sessionId: session.id, title: 'bash' };
  addTab(session.id, tab);
}

export async function removeSession(id: string, deleteWorktree: boolean): Promise<void> {
  await apiDeleteSession(id, deleteWorktree);
  setState('sessions', (prev) => prev.filter((s) => s.id !== id));
  if (state.activeSessionId === id) {
    setState('activeSessionId', null);
  }
}

export async function updateStatus(id: string, status: SessionStatus): Promise<void> {
  await apiUpdateSessionStatus(id, status);
  setState(
    'sessions',
    (s) => s.id === id,
    'status',
    status,
  );
}

export function setActiveSession(id: string | null): void {
  setState('activeSessionId', id);
}
