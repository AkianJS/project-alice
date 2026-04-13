import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockInvoke } from '../test/helpers';

let settingsStore: typeof import('./settingsStore');

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  mockInvoke.mockReset();
  settingsStore = await import('./settingsStore');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadLayout', () => {
  it('A: applies parsed layout when getSetting returns a valid JSON string', async () => {
    mockInvoke.mockResolvedValue('{"leftWidth":300,"rightWidth":350,"leftCollapsed":true,"rightCollapsed":false}');
    await settingsStore.loadLayout();
    expect(settingsStore.layout.leftWidth).toBe(300);
    expect(settingsStore.layout.rightWidth).toBe(350);
    expect(settingsStore.layout.leftCollapsed).toBe(true);
  });

  it('B: keeps defaults when getSetting returns null', async () => {
    mockInvoke.mockResolvedValue(null);
    await settingsStore.loadLayout();
    expect(settingsStore.layout.leftWidth).toBe(220);
  });

  it('C: resolves without throwing when getSetting returns invalid JSON', async () => {
    mockInvoke.mockResolvedValue('not-valid-json');
    await expect(settingsStore.loadLayout()).resolves.toBeUndefined();
    expect(settingsStore.layout.leftWidth).toBe(220);
  });

  it('D: resolves without throwing when getSetting rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('backend error'));
    await expect(settingsStore.loadLayout()).resolves.toBeUndefined();
    expect(settingsStore.layout.leftWidth).toBe(220);
  });
});

describe('updateLayout', () => {
  it('A: updates layout immediately and calls setSetting after 500ms debounce', async () => {
    mockInvoke.mockResolvedValue(undefined);

    settingsStore.updateLayout({ leftWidth: 400 });

    expect(settingsStore.layout.leftWidth).toBe(400);
    expect(mockInvoke).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('set_setting', {
      key: 'panel_layout',
      value: expect.any(String),
    });
  });

  it('B: two rapid calls debounce to a single invoke with the last value', async () => {
    mockInvoke.mockResolvedValue(undefined);

    settingsStore.updateLayout({ leftWidth: 300 });
    settingsStore.updateLayout({ leftWidth: 400 });

    await vi.advanceTimersByTimeAsync(500);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const callArgs = mockInvoke.mock.calls[0];
    const saved = JSON.parse(callArgs[1].value);
    expect(saved.leftWidth).toBe(400);
  });
});

describe('saveLayout timer', () => {
  it('A: does NOT call setSetting before 500ms have elapsed', async () => {
    mockInvoke.mockResolvedValue(undefined);

    settingsStore.saveLayout();
    await vi.advanceTimersByTimeAsync(499);

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('B: calls setSetting exactly once after 500ms have elapsed', async () => {
    mockInvoke.mockResolvedValue(undefined);

    settingsStore.saveLayout();
    await vi.advanceTimersByTimeAsync(500);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('set_setting', {
      key: 'panel_layout',
      value: expect.any(String),
    });
  });
});
