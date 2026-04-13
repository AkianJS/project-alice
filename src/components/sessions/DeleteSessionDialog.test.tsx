import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import DeleteSessionDialog from './DeleteSessionDialog';

function renderDialog(overrides: {
  isOpen?: boolean;
  sessionName?: string;
  onClose?: () => void;
  onDelete?: (deleteWorktree: boolean) => Promise<void>;
} = {}) {
  const props = {
    isOpen: true,
    sessionName: 'feature/x',
    onClose: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(() => <DeleteSessionDialog {...props} />);
  return props;
}

describe('DeleteSessionDialog', () => {
  // A: Session name displayed
  it('A: displays the session name in the description', () => {
    renderDialog({ sessionName: 'feature/x' });
    expect(screen.getByText(/feature\/x/)).toBeTruthy();
  });

  // B: "Delete worktree & branch" calls onDelete(true)
  it('B: clicking "Delete worktree & branch" calls onDelete with true', async () => {
    const props = renderDialog();
    fireEvent.click(screen.getByText('Delete worktree & branch'));
    await vi.waitFor(() => {
      expect(props.onDelete).toHaveBeenCalledWith(true);
    });
  });

  // C: "Keep both (remove session only)" calls onDelete(false)
  it('C: clicking "Keep both (remove session only)" calls onDelete with false', async () => {
    const props = renderDialog();
    fireEvent.click(screen.getByText('Keep both (remove session only)'));
    await vi.waitFor(() => {
      expect(props.onDelete).toHaveBeenCalledWith(false);
    });
  });

  // D: Cancel calls onClose
  it('D: clicking Cancel calls onClose', () => {
    const props = renderDialog();
    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // E: Loading state — "Delete worktree & branch" → 'Deleting…', all 3 buttons disabled
  it('E: shows "Deleting…" and disables all 3 buttons during loading', async () => {
    renderDialog({ onDelete: () => new Promise(() => {}) });
    fireEvent.click(screen.getByText('Delete worktree & branch'));
    await vi.waitFor(() => {
      expect(screen.getByText('Deleting…')).toBeTruthy();
    });
    expect(screen.getByText('Deleting…')).toBeDisabled();
    expect(screen.getByText('Keep both (remove session only)')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});
