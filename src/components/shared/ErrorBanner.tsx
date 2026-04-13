import { Component, Show } from 'solid-js';

interface ErrorBannerAction {
  label: string;
  onClick: () => void;
}

interface ErrorBannerProps {
  message: string;
  level: 'error' | 'warning';
  onDismiss?: () => void;
  action?: ErrorBannerAction;
}

const ErrorBanner: Component<ErrorBannerProps> = (props) => {
  return (
    <>
      <style>{`
        .error-banner {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          border: 1px solid;
        }
        .error-banner--error {
          background-color: color-mix(in srgb, var(--color-error) 15%, transparent);
          color: var(--color-error);
          border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
        }
        .error-banner--warning {
          background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
          color: var(--color-warning);
          border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
        }
        .error-banner__message {
          flex: 1;
        }
        .error-banner__action {
          background: none;
          border: none;
          cursor: pointer;
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: inherit;
          padding: 0;
          text-decoration: underline;
        }
        .error-banner__dismiss {
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
        .error-banner__dismiss:hover {
          opacity: 1;
        }
      `}</style>
      <div
        class="error-banner"
        classList={{
          'error-banner--error': props.level === 'error',
          'error-banner--warning': props.level === 'warning',
        }}
      >
        <span class="error-banner__message">{props.message}</span>
        <Show when={props.action}>
          {(action) => (
            <button class="error-banner__action" onClick={action().onClick}>
              {action().label}
            </button>
          )}
        </Show>
        <Show when={props.onDismiss}>
          {(dismiss) => (
            <button class="error-banner__dismiss" onClick={dismiss()} aria-label="Dismiss">
              ×
            </button>
          )}
        </Show>
      </div>
    </>
  );
};

export default ErrorBanner;
