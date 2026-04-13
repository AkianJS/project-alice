import { createStore } from 'solid-js/store';
import { getSetting, setSetting } from '../lib/tauri';

export interface PanelLayout {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}

const defaults: PanelLayout = {
  leftWidth: 220,
  rightWidth: 280,
  leftCollapsed: false,
  rightCollapsed: false,
};

const [layout, setLayout] = createStore<PanelLayout>({ ...defaults });

export { layout };

export async function loadLayout(): Promise<void> {
  try {
    const raw = await getSetting('panel_layout');
    if (raw) {
      const parsed: PanelLayout = JSON.parse(raw);
      setLayout(parsed);
    }
  } catch {
    // keep defaults
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveLayout(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setSetting('panel_layout', JSON.stringify(layout));
    } catch {
      // ignore
    }
  }, 500);
}

export function updateLayout(patch: Partial<PanelLayout>): void {
  setLayout(patch);
  saveLayout();
}
