import { Component, For } from 'solid-js';
import { createSignal } from 'solid-js';

interface ToastItem {
  id: string;
  message: string;
  level: 'info' | 'error' | 'warning';
}

const [toasts, setToasts] = createSignal<ToastItem[]>([]);

export function showToast(message: string, level: 'info' | 'error' | 'warning' = 'info'): void {
  const id = crypto.randomUUID();
  setToasts((prev) => [...prev, { id, message, level }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 5000);
}

function dismissToast(id: string): void {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

const ToastContainer: Component = () => {
  return (
    <>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: var(--spacing-lg);
          right: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          z-index: 9999;
          pointer-events: none;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          border: 1px solid;
          pointer-events: all;
          max-width: 360px;
          animation: toast-in 0.2s ease;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .toast--info {
          background-color: var(--color-bg-elevated);
          color: var(--color-text-primary);
          border-color: var(--color-border);
        }
        .toast--error {
          background-color: color-mix(in srgb, var(--color-error) 15%, var(--color-bg-elevated));
          color: var(--color-error);
          border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
        }
        .toast--warning {
          background-color: color-mix(in srgb, var(--color-warning) 15%, var(--color-bg-elevated));
          color: var(--color-warning);
          border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
        }
        .toast__message {
          flex: 1;
        }
        .toast__dismiss {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          font-size: var(--font-size-md);
          line-height: 1;
          padding: 0;
          opacity: 0.7;
          flex-shrink: 0;
        }
        .toast__dismiss:hover {
          opacity: 1;
        }
      `}</style>
      <div class="toast-container">
        <For each={toasts()}>
          {(toast) => (
            <div
              class="toast"
              classList={{
                'toast--info': toast.level === 'info',
                'toast--error': toast.level === 'error',
                'toast--warning': toast.level === 'warning',
              }}
            >
              <span class="toast__message">{toast.message}</span>
              <button
                class="toast__dismiss"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
        </For>
      </div>
    </>
  );
};

export default ToastContainer;
