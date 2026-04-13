import { createSignal } from 'solid-js';
import type { FileChange } from '../lib/types';

const [changes, setChanges] = createSignal<FileChange[]>([]);

export { changes };

export function updateChanges(incoming: FileChange[]): void {
  setChanges(incoming);
}

export function clearChanges(): void {
  setChanges([]);
}
