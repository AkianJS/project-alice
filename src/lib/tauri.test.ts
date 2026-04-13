import { describe, it, expect, beforeEach } from 'vitest';
import { mockInvoke } from '../test/helpers';
import {
  validateProject,
  openProject,
  getLastProject,
  getSetting,
  setSetting,
  createSession,
  listSessions,
  updateSessionStatus,
  deleteSession,
  writePty,
  resizePty,
  closePty,
  getChanges,
  getDiff,
  stopWatching,
  getInotifyWarning,
} from './tauri';

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(undefined);
});

describe('tauri wrappers', () => {
  it('validateProject calls invoke with correct command and args', async () => {
    mockInvoke.mockResolvedValue('/validated/path');
    await validateProject('/my/path');
    expect(mockInvoke).toHaveBeenCalledWith('validate_project', { path: '/my/path' });
  });

  it('openProject calls invoke with correct command and args', async () => {
    await openProject('/my/project');
    expect(mockInvoke).toHaveBeenCalledWith('open_project', { path: '/my/project' });
  });

  it('getLastProject calls invoke with correct command and no extra args', async () => {
    mockInvoke.mockResolvedValue('/last/project');
    await getLastProject();
    expect(mockInvoke).toHaveBeenCalledWith('get_last_project');
  });

  it('getSetting calls invoke with correct command and args', async () => {
    mockInvoke.mockResolvedValue('some-value');
    await getSetting('my_key');
    expect(mockInvoke).toHaveBeenCalledWith('get_setting', { key: 'my_key' });
  });

  it('setSetting calls invoke with correct command and args', async () => {
    await setSetting('my_key', 'my_value');
    expect(mockInvoke).toHaveBeenCalledWith('set_setting', { key: 'my_key', value: 'my_value' });
  });

  it('createSession calls invoke with correct command and args', async () => {
    const session = { id: 's1', branchName: 'feature/x', worktreePath: '/tmp', status: 'running', createdAt: 0, updatedAt: 0, worktreeExists: true };
    mockInvoke.mockResolvedValue(session);
    await createSession('feature/x');
    expect(mockInvoke).toHaveBeenCalledWith('create_session', { branchName: 'feature/x' });
  });

  it('listSessions calls invoke with correct command and no extra args', async () => {
    mockInvoke.mockResolvedValue([]);
    await listSessions();
    expect(mockInvoke).toHaveBeenCalledWith('list_sessions');
  });

  it('updateSessionStatus calls invoke with correct command and args', async () => {
    await updateSessionStatus('s1', 'stopped');
    expect(mockInvoke).toHaveBeenCalledWith('update_session_status', { sessionId: 's1', status: 'stopped' });
  });

  it('deleteSession calls invoke with correct command and args', async () => {
    await deleteSession('s1', true);
    expect(mockInvoke).toHaveBeenCalledWith('delete_session', { sessionId: 's1', deleteWorktree: true });
  });

  it('writePty calls invoke with correct command and args', async () => {
    await writePty('tab-1', [104, 105]);
    expect(mockInvoke).toHaveBeenCalledWith('write_pty', { tabId: 'tab-1', data: [104, 105] });
  });

  it('resizePty calls invoke with correct command and args', async () => {
    await resizePty('tab-1', 80, 24);
    expect(mockInvoke).toHaveBeenCalledWith('resize_pty', { tabId: 'tab-1', cols: 80, rows: 24 });
  });

  it('closePty calls invoke with correct command and args', async () => {
    await closePty('tab-1');
    expect(mockInvoke).toHaveBeenCalledWith('close_pty', { tabId: 'tab-1' });
  });

  it('getChanges calls invoke with correct command and args', async () => {
    mockInvoke.mockResolvedValue([]);
    await getChanges('/worktree/path');
    expect(mockInvoke).toHaveBeenCalledWith('get_changes', { worktreePath: '/worktree/path' });
  });

  it('getDiff calls invoke with correct command and args', async () => {
    mockInvoke.mockResolvedValue('diff output');
    await getDiff('/worktree/path', 'src/index.ts');
    expect(mockInvoke).toHaveBeenCalledWith('get_diff', { worktreePath: '/worktree/path', filePath: 'src/index.ts' });
  });

  it('stopWatching calls invoke with correct command and args', async () => {
    await stopWatching('s1');
    expect(mockInvoke).toHaveBeenCalledWith('stop_watching', { sessionId: 's1' });
  });

  it('getInotifyWarning calls invoke with correct command and no extra args', async () => {
    mockInvoke.mockResolvedValue(null);
    await getInotifyWarning();
    expect(mockInvoke).toHaveBeenCalledWith('get_inotify_warning');
  });
});
