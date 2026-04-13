import { Component } from 'solid-js';
import type { FileChange } from '../../lib/types';

interface Props {
  change: FileChange;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
};

const STATUS_COLORS: Record<string, string> = {
  modified: 'var(--color-status-modified)',
  added: 'var(--color-diff-add)',
  deleted: 'var(--color-diff-del)',
  renamed: 'var(--color-status-renamed)',
};

const FileChangeItem: Component<Props> = (props) => {
  const label = () => STATUS_LABELS[props.change.status] ?? '?';
  const color = () => STATUS_COLORS[props.change.status] ?? 'var(--color-text-muted)';

  return (
    <button
      class="file-change-item"
      classList={{ 'file-change-item--selected': props.isSelected }}
      onClick={props.onClick}
      title={props.change.oldPath ? `${props.change.oldPath} → ${props.change.path}` : props.change.path}
    >
      <span class="file-change-badge" style={{ color: color() }}>
        {label()}
      </span>
      <span class="file-change-path">{props.change.path}</span>
    </button>
  );
};

export default FileChangeItem;
