import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockInvoke, makeSession } from '../test/helpers';

let sessionStore: typeof import('./sessionStore');
let terminalStore: typeof import('./terminalStore');

beforeEach(async () => {
  vi.resetModules();
  sessionStore = await import('./sessionStore');
  terminalStore = await import('./terminalStore');
  mockInvoke.mockReset();
});

describe('loadSessions', () => {
  it('A: populates sessions from invoke result', async () => {
    mockInvoke.mockResolvedValue([makeSession({ id: 's1', branchName: 'main' })]);
    await sessionStore.loadSessions();
    expect(sessionStore.sessionState.sessions).toHaveLength(1);
    expect(sessionStore.sessionState.sessions[0].branchName).toBe('main');
    expect(mockInvoke).toHaveBeenCalledWith('list_sessions');
  });

  it('B: sets sessions to empty array when invoke returns []', async () => {
    mockInvoke.mockResolvedValue([]);
    await sessionStore.loadSessions();
    expect(sessionStore.sessionState.sessions).toEqual([]);
  });

  it('C: rejects when invoke rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('network error'));
    await expect(sessionStore.loadSessions()).rejects.toThrow('network error');
  });
});

describe('addSession', () => {
  it('A: creates session, updates state, adds terminal tab', async () => {
    const session = makeSession({ id: 'new-id', branchName: 'feature/x' });
    mockInvoke.mockResolvedValue(session);

    await sessionStore.addSession('feature/x');

    expect(mockInvoke).toHaveBeenCalledWith('create_session', { branchName: 'feature/x' });
    expect(sessionStore.sessionState.sessions.some((s) => s.id === 'new-id')).toBe(true);
    expect(sessionStore.sessionState.activeSessionId).toBe('new-id');

    const tabs = terminalStore.getTabsForSession('new-id');
    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe('bash');
  });

  it('B: rejects when invoke rejects; sessions unchanged', async () => {
    mockInvoke.mockRejectedValue(new Error('create failed'));
    await expect(sessionStore.addSession('bad-branch')).rejects.toThrow('create failed');
    expect(sessionStore.sessionState.sessions).toHaveLength(0);
  });
});

describe('removeSession', () => {
  it('A: removes session and clears activeSessionId when active session is removed', async () => {
    // Load initial sessions
    mockInvoke.mockResolvedValueOnce([makeSession({ id: 's1' }), makeSession({ id: 's2' })]);
    await sessionStore.loadSessions();
    sessionStore.setActiveSession('s1');

    // Reset and mock the delete call
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(undefined);

    await sessionStore.removeSession('s1', false);

    expect(mockInvoke).toHaveBeenCalledWith('delete_session', { sessionId: 's1', deleteWorktree: false });
    expect(sessionStore.sessionState.sessions.some((s) => s.id === 's1')).toBe(false);
    expect(sessionStore.sessionState.activeSessionId).toBeNull();
  });

  it('B: does not change activeSessionId when a non-active session is removed', async () => {
    // Load initial sessions
    mockInvoke.mockResolvedValueOnce([makeSession({ id: 's1' }), makeSession({ id: 's2' })]);
    await sessionStore.loadSessions();
    sessionStore.setActiveSession('s2');

    // Reset and mock the delete call
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(undefined);

    await sessionStore.removeSession('s1', false);

    expect(sessionStore.sessionState.activeSessionId).toBe('s2');
  });
});

describe('updateStatus', () => {
  it('A: updates the status field of the matching session', async () => {
    const session = makeSession({ id: 's1', status: 'running' });
    mockInvoke.mockResolvedValueOnce([session]);
    await sessionStore.loadSessions();

    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(undefined);

    await sessionStore.updateStatus('s1', 'stopped');

    expect(mockInvoke).toHaveBeenCalledWith('update_session_status', { sessionId: 's1', status: 'stopped' });
    const updated = sessionStore.sessionState.sessions.find((s) => s.id === 's1');
    expect(updated?.status).toBe('stopped');
  });
});

describe('setActiveSession', () => {
  it('A: sets activeSessionId to the given id', () => {
    sessionStore.setActiveSession('s1');
    expect(sessionStore.sessionState.activeSessionId).toBe('s1');
  });

  it('B: sets activeSessionId to null', () => {
    sessionStore.setActiveSession('s1');
    sessionStore.setActiveSession(null);
    expect(sessionStore.sessionState.activeSessionId).toBeNull();
  });
});
