import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import SessionItem from './SessionItem';
import { makeSession } from '../../test/helpers';

describe('SessionItem', () => {
  // A: Status dot — running
  it('A: status dot has correct background-color for running', () => {
    const session = makeSession({ status: 'running' });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const dot = document.querySelector('.session-status-dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--color-status-running)');
  });

  // B: Status dot — stopped
  it('B: status dot has correct background-color for stopped', () => {
    const session = makeSession({ status: 'stopped' });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const dot = document.querySelector('.session-status-dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--color-status-stopped)');
  });

  // C: Status dot — finished
  it('C: status dot has correct background-color for finished', () => {
    const session = makeSession({ status: 'finished' });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const dot = document.querySelector('.session-status-dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--color-status-finished)');
  });

  // D: Active class present when isActive=true
  it('D: root element has "active" class when isActive is true', () => {
    const session = makeSession();
    render(() => (
      <SessionItem session={session} isActive={true} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const item = document.querySelector('.session-item')!;
    expect(item.classList.contains('active')).toBe(true);
  });

  // E: Active class absent when isActive=false
  it('E: root element does not have "active" class when isActive is false', () => {
    const session = makeSession();
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const item = document.querySelector('.session-item')!;
    expect(item.classList.contains('active')).toBe(false);
  });

  // F: Branch name displayed
  it('F: renders the session branch name', () => {
    const session = makeSession({ branchName: 'feature/my-feature' });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    expect(screen.getByText('feature/my-feature')).toBeTruthy();
  });

  // G: Orphan warning shown when worktreeExists=false
  it('G: shows orphan warning icon when worktreeExists is false', () => {
    const session = makeSession({ worktreeExists: false });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const icon = document.querySelector('.session-missing-icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.title).toContain('missing');
  });

  // H: Orphan warning absent when worktreeExists=true
  it('H: does not show orphan warning icon when worktreeExists is true', () => {
    const session = makeSession({ worktreeExists: true });
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={vi.fn()} />
    ));
    const icon = document.querySelector('.session-missing-icon');
    expect(icon).toBeNull();
  });

  // I: onClick fires on click
  it('I: calls onClick when the item is clicked', () => {
    const onClick = vi.fn();
    const session = makeSession();
    render(() => (
      <SessionItem session={session} isActive={false} onClick={onClick} onContextMenu={vi.fn()} />
    ));
    const item = document.querySelector('.session-item')!;
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // J: onContextMenu fires on right-click
  it('J: calls onContextMenu when the item receives a contextmenu event', () => {
    const onContextMenu = vi.fn();
    const session = makeSession();
    render(() => (
      <SessionItem session={session} isActive={false} onClick={vi.fn()} onContextMenu={onContextMenu} />
    ));
    const item = document.querySelector('.session-item')!;
    fireEvent.contextMenu(item);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
  });
});
