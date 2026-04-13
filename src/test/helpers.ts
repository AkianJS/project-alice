import { invoke } from '@tauri-apps/api/core';
import type { Session, FileChange } from '../lib/types';

// Typed reference to the globally mocked invoke from setup.ts.
// Use this in tests: mockInvoke.mockResolvedValue(...) or mockInvoke.mockImplementation(...)
export const mockInvoke = invoke as unknown as import('vitest').Mock;

/**
 * Factory for Session objects. All fields have safe defaults so tests only
 * need to specify the fields they care about.
 */
export function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: crypto.randomUUID(),
    branchName: 'test-branch',
    worktreePath: '/tmp/test-worktree',
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    worktreeExists: true,
    ...overrides,
  };
}

/**
 * Factory for FileChange objects. Defaults to a modified TypeScript file.
 */
export function makeFileChange(overrides?: Partial<FileChange>): FileChange {
  return {
    path: 'src/index.ts',
    status: 'modified',
    ...overrides,
  };
}

/**
 * Pattern for testing stores/signals that hold module-level state.
 *
 * Signal contamination between tests happens because Solid stores are
 * module singletons — state from one test leaks into the next.
 *
 * Safe isolation pattern:
 *
 *   let myStore: typeof import('../stores/myStore');
 *
 *   beforeEach(async () => {
 *     vi.resetModules();                                   // wipe module cache
 *     myStore = await import('../stores/myStore');         // fresh module instance
 *   });
 *
 * Always pair vi.resetModules() with a dynamic import INSIDE beforeEach —
 * never import at the top of the test file for stores you intend to isolate.
 */
