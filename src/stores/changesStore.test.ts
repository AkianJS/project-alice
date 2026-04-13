import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FileChange } from '../lib/types';

let changesStore: typeof import('./changesStore');

beforeEach(async () => {
  vi.resetModules();
  changesStore = await import('./changesStore');
});

describe('changesStore', () => {
  it('initial state returns empty array', () => {
    expect(changesStore.changes()).toEqual([]);
  });

  it('updateChanges sets the provided array', () => {
    const incoming: FileChange[] = [{ path: 'a.ts', status: 'modified' }];
    changesStore.updateChanges(incoming);
    expect(changesStore.changes()).toEqual(incoming);
  });

  it('updateChanges replaces entirely, does not append', () => {
    const first: FileChange[] = [{ path: 'a.ts', status: 'modified' }];
    const second: FileChange[] = [{ path: 'b.ts', status: 'added' }];
    changesStore.updateChanges(first);
    changesStore.updateChanges(second);
    expect(changesStore.changes()).toHaveLength(1);
    expect(changesStore.changes()[0]).toMatchObject({ path: 'b.ts' });
  });

  it('updateChanges([]) clears the store', () => {
    const incoming: FileChange[] = [{ path: 'a.ts', status: 'modified' }];
    changesStore.updateChanges(incoming);
    changesStore.updateChanges([]);
    expect(changesStore.changes()).toEqual([]);
  });

  it('clearChanges from non-empty returns empty array', () => {
    const incoming: FileChange[] = [{ path: 'a.ts', status: 'modified' }];
    changesStore.updateChanges(incoming);
    changesStore.clearChanges();
    expect(changesStore.changes()).toEqual([]);
  });

  it('clearChanges from empty stays empty', () => {
    changesStore.clearChanges();
    expect(changesStore.changes()).toEqual([]);
  });
});
