import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockRejectedValue(
    new Error('invoke() called without mock — set up mockInvoke in your test')
  ),
  Channel: vi.fn().mockImplementation(() => ({
    id: 0,
    onmessage: null as ((event: unknown) => void) | null,
  })),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));
