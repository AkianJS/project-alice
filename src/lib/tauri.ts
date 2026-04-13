import { Channel, invoke } from '@tauri-apps/api/core';
import type { FileChange, Session, SessionStatus, WatcherEvent } from './types';

export type PtyOutputEvent = { tab_id: string; data: number[] };

export function validateProject(path: string): Promise<string> {
  return invoke<string>('validate_project', { path });
}

export function openProject(path: string): Promise<void> {
  return invoke<void>('open_project', { path });
}

export function getLastProject(): Promise<string | null> {
  return invoke<string | null>('get_last_project');
}

export function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>('get_setting', { key });
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke<void>('set_setting', { key, value });
}

export function createSession(branchName: string): Promise<Session> {
  return invoke<Session>('create_session', { branchName });
}

export function listSessions(): Promise<Session[]> {
  return invoke<Session[]>('list_sessions');
}

export function updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
  return invoke<void>('update_session_status', { sessionId, status });
}

export function deleteSession(sessionId: string, deleteWorktree: boolean): Promise<void> {
  return invoke<void>('delete_session', { sessionId, deleteWorktree });
}

export function openPty(
  sessionId: string,
  tabId: string,
  cwd: string,
  cols: number,
  rows: number,
  channel: Channel<PtyOutputEvent>,
): Promise<void> {
  return invoke<void>('open_pty', { sessionId, tabId, cwd, cols, rows, onOutput: channel });
}

export function writePty(tabId: string, data: number[]): Promise<void> {
  return invoke<void>('write_pty', { tabId, data });
}

export function resizePty(tabId: string, cols: number, rows: number): Promise<void> {
  return invoke<void>('resize_pty', { tabId, cols, rows });
}

export function closePty(tabId: string): Promise<void> {
  return invoke<void>('close_pty', { tabId });
}

// ── Changes / Watcher ─────────────────────────────────────────────────────────

export function getChanges(worktreePath: string): Promise<FileChange[]> {
  return invoke<FileChange[]>('get_changes', { worktreePath });
}

export function getDiff(worktreePath: string, filePath: string): Promise<string> {
  return invoke<string>('get_diff', { worktreePath, filePath });
}

export function startWatching(
  sessionId: string,
  worktreePath: string,
  channel: Channel<WatcherEvent>,
): Promise<void> {
  return invoke<void>('start_watching', { sessionId, worktreePath, onChanges: channel });
}

export function stopWatching(sessionId: string): Promise<void> {
  return invoke<void>('stop_watching', { sessionId });
}

export function getInotifyWarning(): Promise<string | null> {
  return invoke<string | null>('get_inotify_warning');
}
