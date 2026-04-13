import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import NewSessionDialog from './NewSessionDialog';

function renderDialog(overrides: {
  isOpen?: boolean;
  onClose?: () => void;
  onSubmit?: (name: string) => Promise<void>;
} = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(() => <NewSessionDialog {...props} />);
  return props;
}

function getInput() {
  return screen.getByPlaceholderText('feature/my-branch') as HTMLInputElement;
}

function setInput(input: HTMLInputElement, value: string) {
  fireEvent.input(input, { target: { value } });
}

describe('NewSessionDialog', () => {
  // A: Empty submit → validation error, onSubmit NOT called
  it('A: shows "Branch name is required" for empty submit and does not call onSubmit', async () => {
    const props = renderDialog();
    const submitBtn = screen.getByText('Create');
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Branch name is required')).toBeTruthy();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  // B: Invalid branch name → invalid characters error
  it('B: shows "Branch name contains invalid characters" for invalid input', async () => {
    renderDialog();
    setInput(getInput(), 'bad name!');
    fireEvent.click(screen.getByText('Create'));
    expect(await screen.findByText('Branch name contains invalid characters')).toBeTruthy();
  });

  // C: Valid branch → onSubmit called with trimmed value
  it('C: calls onSubmit with trimmed branch name for valid input', async () => {
    const props = renderDialog();
    setInput(getInput(), 'feature/test');
    fireEvent.click(screen.getByText('Create'));
    // Wait for submit to process
    await vi.waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith('feature/test');
    });
  });

  // D: Loading state — never-resolving onSubmit → 'Creating…', button disabled, input disabled
  it('D: shows "Creating…" and disables button and input while loading', async () => {
    renderDialog({ onSubmit: () => new Promise(() => {}) });
    setInput(getInput(), 'feature/test');
    fireEvent.click(screen.getByText('Create'));
    await vi.waitFor(() => {
      expect(screen.getByText('Creating…')).toBeTruthy();
    });
    const submitBtn = screen.getByText('Creating…');
    expect(submitBtn).toBeDisabled();
    expect(getInput()).toBeDisabled();
  });

  // E: Successful submit → input cleared, no error
  it('E: clears input and shows no error after successful submit', async () => {
    renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) });
    setInput(getInput(), 'feature/test');
    fireEvent.click(screen.getByText('Create'));
    await vi.waitFor(() => {
      expect(getInput().value).toBe('');
    });
    expect(document.querySelector('.modal-error')).toBeNull();
  });

  // F: onSubmit rejection → error message shown
  it('F: shows rejection error message when onSubmit rejects', async () => {
    renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('Server error')) });
    setInput(getInput(), 'feature/test');
    fireEvent.click(screen.getByText('Create'));
    expect(await screen.findByText('Server error')).toBeTruthy();
  });

  // G: Enter key triggers submit with valid input
  it('G: Enter key triggers submit with valid input', async () => {
    const props = renderDialog();
    const input = getInput();
    setInput(input, 'feature/test');
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith('feature/test');
    });
  });

  // H: Enter during loading does NOT re-submit
  it('H: Enter key during loading does not re-submit', async () => {
    const onSubmit = vi.fn().mockImplementation(
      () => new Promise<void>(() => {})
    );
    renderDialog({ onSubmit });
    const input = getInput();
    setInput(input, 'feature/test');
    fireEvent.click(screen.getByText('Create'));
    // Wait for loading state
    await vi.waitFor(() => {
      expect(screen.getByText('Creating…')).toBeTruthy();
    });
    // Press Enter while loading
    fireEvent.keyDown(input, { key: 'Enter' });
    // onSubmit should still only have been called once
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // I: Cancel calls onClose
  it('I: Cancel button calls onClose', () => {
    const props = renderDialog();
    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
