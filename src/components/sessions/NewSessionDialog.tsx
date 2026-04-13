import { Component, createSignal, Show } from 'solid-js';
import Modal from '../shared/Modal';

interface NewSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (branchName: string) => Promise<void>;
}

const BRANCH_RE = /^[a-zA-Z0-9/_.-]+$/;

export function validateBranch(name: string): string | null {
  if (!name.trim()) return 'Branch name is required';
  if (!BRANCH_RE.test(name)) return 'Branch name contains invalid characters';
  return null;
}

const NewSessionDialog: Component<NewSessionDialogProps> = (props) => {
  const [value, setValue] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  const reset = () => {
    setValue('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    props.onClose();
  };

  const handleSubmit = async () => {
    const name = value().trim();
    const err = validateBranch(name);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await props.onSubmit(name);
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !loading()) handleSubmit();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title="New Session">
      <label class="modal-label">Branch name</label>
      <input
        ref={(el) => {
          if (props.isOpen) setTimeout(() => el.focus(), 0);
        }}
        class="modal-input"
        type="text"
        value={value()}
        onInput={(e) => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={loading()}
        placeholder="feature/my-branch"
      />
      <Show when={error()}>
        <div class="modal-error">{error()}</div>
      </Show>
      <div class="modal-actions">
        <button class="btn btn-secondary" onClick={handleClose} disabled={loading()}>
          Cancel
        </button>
        <button class="btn btn-primary" onClick={handleSubmit} disabled={loading()}>
          {loading() ? 'Creating…' : 'Create'}
        </button>
      </div>
    </Modal>
  );
};

export default NewSessionDialog;
