import { Component, createSignal } from 'solid-js';
import Modal from '../shared/Modal';

interface DeleteSessionDialogProps {
  isOpen: boolean;
  sessionName: string;
  onClose: () => void;
  onDelete: (deleteWorktree: boolean) => Promise<void>;
}

const DeleteSessionDialog: Component<DeleteSessionDialogProps> = (props) => {
  const [loading, setLoading] = createSignal(false);

  const handleDelete = async (deleteWorktree: boolean) => {
    setLoading(true);
    try {
      await props.onDelete(deleteWorktree);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .delete-dialog-desc {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          margin: 0 0 var(--spacing-lg) 0;
        }
        .delete-dialog-name {
          color: var(--color-text-primary);
          font-weight: 600;
        }
        .delete-dialog-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
      `}</style>
      <Modal isOpen={props.isOpen} onClose={props.onClose} title="Delete Session">
        <p class="delete-dialog-desc">
          Delete session <span class="delete-dialog-name">{props.sessionName}</span>?
        </p>
        <div class="delete-dialog-actions">
          <button
            class="btn btn-danger"
            onClick={() => handleDelete(true)}
            disabled={loading()}
          >
            {loading() ? 'Deleting…' : 'Delete worktree & branch'}
          </button>
          <button
            class="btn btn-secondary"
            onClick={() => handleDelete(false)}
            disabled={loading()}
          >
            Keep both (remove session only)
          </button>
          <button class="btn btn-secondary" onClick={props.onClose} disabled={loading()}>
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
};

export default DeleteSessionDialog;
