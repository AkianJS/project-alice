import { Component, JSX, Show, onCleanup, onMount } from 'solid-js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}

const Modal: Component<ModalProps> = (props) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <style>{`
        .modal-label {
          display: block;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }
        .modal-input {
          width: 100%;
          box-sizing: border-box;
          background-color: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-size: var(--font-size-md);
          padding: var(--spacing-sm) var(--spacing-md);
          outline: none;
        }
        .modal-input:focus {
          border-color: var(--color-accent);
        }
        .modal-error {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          margin-top: var(--spacing-xs);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-lg);
        }
      `}</style>
      <Show when={props.isOpen}>
        <div class="modal-overlay" onClick={props.onClose}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 class="modal-title">{props.title}</h2>
            {props.children}
          </div>
        </div>
      </Show>
    </>
  );
};

export default Modal;
