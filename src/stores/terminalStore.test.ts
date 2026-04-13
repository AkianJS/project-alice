import { describe, it, expect, beforeEach, vi } from 'vitest';

let store: typeof import('./terminalStore');

beforeEach(async () => {
  vi.resetModules();
  store = await import('./terminalStore');
});

describe('terminalStore — addTab', () => {
  it('A: adds first tab and sets it as active', () => {
    const tab = { id: 't1', sessionId: 's1', title: 'bash' };
    store.addTab('s1', tab);
    expect(store.getTabsForSession('s1')).toEqual([tab]);
    expect(store.getActiveTabForSession('s1')).toBe('t1');
  });

  it('B: adding second tab appends and updates active', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's1', title: 'zsh' };
    store.addTab('s1', t1);
    store.addTab('s1', t2);
    expect(store.getTabsForSession('s1')).toHaveLength(2);
    expect(store.getActiveTabForSession('s1')).toBe('t2');
  });

  it('C: tabs for different sessions are isolated', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's2', title: 'zsh' };
    store.addTab('s1', t1);
    store.addTab('s2', t2);
    expect(store.getTabsForSession('s1')).toEqual([t1]);
    expect(store.getTabsForSession('s2')).toEqual([t2]);
    expect(store.getActiveTabForSession('s1')).toBe('t1');
    expect(store.getActiveTabForSession('s2')).toBe('t2');
  });
});

describe('terminalStore — removeTab', () => {
  it('A: removing non-active tab keeps active unchanged', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's1', title: 'zsh' };
    store.addTab('s1', t1);
    store.addTab('s1', t2);
    store.setActiveTab('s1', 't1');
    store.removeTab('s1', 't2');
    expect(store.getTabsForSession('s1')).toEqual([t1]);
    expect(store.getActiveTabForSession('s1')).toBe('t1');
  });

  it('B: removing active tab sets active to last remaining', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's1', title: 'zsh' };
    const t3 = { id: 't3', sessionId: 's1', title: 'fish' };
    store.addTab('s1', t1);
    store.addTab('s1', t2);
    store.addTab('s1', t3);
    store.setActiveTab('s1', 't2');
    store.removeTab('s1', 't2');
    expect(store.getTabsForSession('s1')).toEqual([t1, t3]);
    expect(store.getActiveTabForSession('s1')).toBe('t3');
  });

  it('C: removing the only tab results in empty list and null active', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    store.addTab('s1', t1);
    store.removeTab('s1', 't1');
    expect(store.getTabsForSession('s1')).toEqual([]);
    expect(store.getActiveTabForSession('s1')).toBeNull();
  });

  it('D: removing a non-existent tab is a no-op', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    store.addTab('s1', t1);
    store.removeTab('s1', 'nonexistent');
    expect(store.getTabsForSession('s1')).toEqual([t1]);
    expect(store.getActiveTabForSession('s1')).toBe('t1');
  });
});

describe('terminalStore — setActiveTab', () => {
  it('A: setActiveTab updates active tab id', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's1', title: 'zsh' };
    store.addTab('s1', t1);
    store.addTab('s1', t2);
    store.setActiveTab('s1', 't2');
    expect(store.getActiveTabForSession('s1')).toBe('t2');
    store.setActiveTab('s1', 't1');
    expect(store.getActiveTabForSession('s1')).toBe('t1');
  });
});

describe('terminalStore — clearSession', () => {
  it('A: clears all tabs and active for a session with tabs', () => {
    const t1 = { id: 't1', sessionId: 's1', title: 'bash' };
    const t2 = { id: 't2', sessionId: 's1', title: 'zsh' };
    store.addTab('s1', t1);
    store.addTab('s1', t2);
    store.clearSession('s1');
    expect(store.getTabsForSession('s1')).toEqual([]);
    expect(store.getActiveTabForSession('s1')).toBeNull();
  });

  it('B: clearing an empty session leaves it empty with null active', () => {
    store.clearSession('s1');
    expect(store.getTabsForSession('s1')).toEqual([]);
    expect(store.getActiveTabForSession('s1')).toBeNull();
  });
});

describe('terminalStore — defaults', () => {
  it('A: unknown session returns empty tabs and null active', () => {
    expect(store.getTabsForSession('unknown')).toEqual([]);
    expect(store.getActiveTabForSession('unknown')).toBeNull();
  });
});
