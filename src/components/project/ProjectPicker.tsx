import { createSignal, Show } from 'solid-js';
import { open } from '@tauri-apps/plugin-dialog';
import { validateProject } from '../../lib/tauri';

interface ProjectPickerProps {
  onSelect: (path: string) => void;
  errorMessage?: string;
}

const ProjectPicker = (props: ProjectPickerProps) => {
  const [inlineError, setInlineError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  const handleBrowse = async () => {
    setInlineError(null);
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== 'string') return;

    setLoading(true);
    try {
      const canonical = await validateProject(selected);
      props.onSelect(canonical);
    } catch (err) {
      setInlineError(typeof err === 'string' ? err : 'Not a valid git repository.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="picker-backdrop">
      <div class="picker-card">
        <div class="picker-icon">⬡</div>
        <h1 class="picker-title">Project Alice</h1>
        <p class="picker-subtitle">Select a git repository to get started</p>

        <Show when={props.errorMessage}>
          <div class="picker-banner picker-banner--error">{props.errorMessage}</div>
        </Show>

        <Show when={inlineError()}>
          <div class="picker-banner picker-banner--error">{inlineError()}</div>
        </Show>

        <button
          class="picker-btn"
          onClick={handleBrowse}
          disabled={loading()}
        >
          {loading() ? 'Validating…' : 'Browse…'}
        </button>
      </div>
    </div>
  );
};

export default ProjectPicker;
