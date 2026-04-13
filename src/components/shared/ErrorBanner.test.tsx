import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import ErrorBanner from './ErrorBanner';

describe('ErrorBanner', () => {
  // A: error-banner--error class for level='error'
  it('A: applies "error-banner--error" class for level="error"', () => {
    render(() => <ErrorBanner message="Something went wrong" level="error" />);
    const banner = document.querySelector('.error-banner')!;
    expect(banner.classList.contains('error-banner--error')).toBe(true);
    expect(banner.classList.contains('error-banner--warning')).toBe(false);
  });

  // B: error-banner--warning class for level='warning'
  it('B: applies "error-banner--warning" class for level="warning"', () => {
    render(() => <ErrorBanner message="Watch out" level="warning" />);
    const banner = document.querySelector('.error-banner')!;
    expect(banner.classList.contains('error-banner--warning')).toBe(true);
    expect(banner.classList.contains('error-banner--error')).toBe(false);
  });

  // C: Message text rendered
  it('C: renders the message text', () => {
    render(() => <ErrorBanner message="Connection failed" level="error" />);
    expect(screen.getByText('Connection failed')).toBeTruthy();
  });

  // D: Dismiss button calls onDismiss
  it('D: dismiss button calls onDismiss when clicked', () => {
    const onDismiss = vi.fn();
    render(() => <ErrorBanner message="An error" level="error" onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // E: No dismiss button when onDismiss not provided
  it('E: does not render dismiss button when onDismiss is not provided', () => {
    render(() => <ErrorBanner message="An error" level="error" />);
    expect(document.querySelector('.error-banner__dismiss')).toBeNull();
  });

  // F: Action button renders and fires onClick
  it('F: renders action button and calls its onClick when clicked', () => {
    const actionOnClick = vi.fn();
    render(() => (
      <ErrorBanner
        message="An error"
        level="error"
        action={{ label: 'Retry', onClick: actionOnClick }}
      />
    ));
    const btn = screen.getByText('Retry');
    fireEvent.click(btn);
    expect(actionOnClick).toHaveBeenCalledTimes(1);
  });

  // G: No action button when action not provided
  it('G: does not render action button when action is not provided', () => {
    render(() => <ErrorBanner message="An error" level="error" />);
    expect(document.querySelector('.error-banner__action')).toBeNull();
  });
});
