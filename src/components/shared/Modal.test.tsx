import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import Modal from './Modal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  title: 'Test Modal',
};

describe('Modal', () => {
  // A: Hidden when isOpen=false
  it('A: does not render content when isOpen is false', () => {
    render(() => (
      <Modal {...defaultProps} isOpen={false} onClose={vi.fn()}>
        <span>modal body</span>
      </Modal>
    ));
    expect(screen.queryByText('Test Modal')).toBeNull();
    expect(screen.queryByText('modal body')).toBeNull();
  });

  // B: Visible when isOpen=true
  it('B: renders title and children when isOpen is true', () => {
    render(() => (
      <Modal {...defaultProps} onClose={vi.fn()}>
        <span>modal body</span>
      </Modal>
    ));
    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('modal body')).toBeTruthy();
  });

  // C: Escape calls onClose
  it('C: calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(() => (
      <Modal {...defaultProps} onClose={onClose}>
        <span>content</span>
      </Modal>
    ));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // D: Other key does NOT call onClose
  it('D: does not call onClose when Enter key is pressed', () => {
    const onClose = vi.fn();
    render(() => (
      <Modal {...defaultProps} onClose={onClose}>
        <span>content</span>
      </Modal>
    ));
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // E: Overlay click calls onClose
  it('E: calls onClose when overlay (.modal-overlay) is clicked', () => {
    const onClose = vi.fn();
    render(() => (
      <Modal {...defaultProps} onClose={onClose}>
        <span>content</span>
      </Modal>
    ));
    const overlay = document.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // F: Content click does NOT call onClose
  it('F: does not call onClose when content (.modal-content) is clicked', () => {
    const onClose = vi.fn();
    render(() => (
      <Modal {...defaultProps} onClose={onClose}>
        <span>content</span>
      </Modal>
    ));
    const content = document.querySelector('.modal-content')!;
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });
});
