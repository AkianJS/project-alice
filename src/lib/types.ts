export type SessionStatus = 'running' | 'stopped' | 'finished';

export interface Session {
  id: string;
  branchName: string;
  worktreePath: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  /** False when the worktree directory no longer exists on disk (orphaned). */
  worktreeExists: boolean;
}

export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed';

export interface FileChange {
  path: string;
  status: FileStatus;
  oldPath?: string;
}

export interface WatcherEvent {
  sessionId: string;
  changes: FileChange[];
}
