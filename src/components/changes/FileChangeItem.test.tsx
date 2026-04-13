import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import FileChangeItem from './FileChangeItem';
import { makeFileChange } from '../../test/helpers';

describe('FileChangeItem', () => {
  // A: Badge letter and color for modified
  it('A: shows "M" badge with modified color for modified status', () => {
    const change = makeFileChange({ status: 'modified', path: 'src/foo.ts' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const badge = document.querySelector('.file-change-badge') as HTMLElement;
    expect(badge.textContent).toBe('M');
    expect(badge.style.color).toBe('var(--color-status-modified)');
  });

  // B: Badge letter and color for added
  it('B: shows "A" badge with added color for added status', () => {
    const change = makeFileChange({ status: 'added', path: 'src/new.ts' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const badge = document.querySelector('.file-change-badge') as HTMLElement;
    expect(badge.textContent).toBe('A');
    expect(badge.style.color).toBe('var(--color-diff-add)');
  });

  // C: Badge letter and color for deleted
  it('C: shows "D" badge with deleted color for deleted status', () => {
    const change = makeFileChange({ status: 'deleted', path: 'src/old.ts' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const badge = document.querySelector('.file-change-badge') as HTMLElement;
    expect(badge.textContent).toBe('D');
    expect(badge.style.color).toBe('var(--color-diff-del)');
  });

  // D: Badge letter and color for renamed
  it('D: shows "R" badge with renamed color for renamed status', () => {
    const change = makeFileChange({ status: 'renamed', path: 'src/new-name.ts', oldPath: 'src/old-name.ts' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const badge = document.querySelector('.file-change-badge') as HTMLElement;
    expect(badge.textContent).toBe('R');
    expect(badge.style.color).toBe('var(--color-status-renamed)');
  });

  // E: Selected class present when isSelected=true
  it('E: has "file-change-item--selected" class when isSelected is true', () => {
    const change = makeFileChange();
    render(() => <FileChangeItem change={change} isSelected={true} onClick={vi.fn()} />);
    const btn = document.querySelector('.file-change-item')!;
    expect(btn.classList.contains('file-change-item--selected')).toBe(true);
  });

  // F: Selected class absent when isSelected=false
  it('F: does not have "file-change-item--selected" class when isSelected is false', () => {
    const change = makeFileChange();
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const btn = document.querySelector('.file-change-item')!;
    expect(btn.classList.contains('file-change-item--selected')).toBe(false);
  });

  // G: Path displayed
  it('G: renders the file path in .file-change-path', () => {
    const change = makeFileChange({ path: 'src/components/App.tsx' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('src/components/App.tsx')).toBeTruthy();
  });

  // H: Title for non-renamed (path only)
  it('H: title attribute is just the path when there is no oldPath', () => {
    const change = makeFileChange({ path: 'src/foo.ts', status: 'modified' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const btn = document.querySelector('.file-change-item')!;
    expect(btn.getAttribute('title')).toBe('src/foo.ts');
  });

  // I: Title for renamed (oldPath → path, U+2192)
  it('I: title attribute shows "oldPath → path" (U+2192) when oldPath is set', () => {
    const change = makeFileChange({ status: 'renamed', path: 'src/new.ts', oldPath: 'src/old.ts' });
    render(() => <FileChangeItem change={change} isSelected={false} onClick={vi.fn()} />);
    const btn = document.querySelector('.file-change-item')!;
    expect(btn.getAttribute('title')).toBe('src/old.ts \u2192 src/new.ts');
  });

  // J: onClick fires
  it('J: calls onClick when the button is clicked', () => {
    const onClick = vi.fn();
    const change = makeFileChange();
    render(() => <FileChangeItem change={change} isSelected={false} onClick={onClick} />);
    const btn = document.querySelector('.file-change-item')!;
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
