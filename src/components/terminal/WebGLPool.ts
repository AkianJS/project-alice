import type { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';

const MAX_CONTEXTS = 4;

interface PoolEntry {
  terminal: Terminal;
  addon: WebglAddon;
  lastUsed: number;
}

class WebGLPool {
  private active: Map<string, PoolEntry> = new Map();

  acquire(tabId: string, terminal: Terminal): void {
    if (this.active.has(tabId)) {
      this.active.get(tabId)!.lastUsed = Date.now();
      return;
    }

    if (this.active.size >= MAX_CONTEXTS) {
      let lruKey = '';
      let lruTime = Infinity;
      for (const [key, entry] of this.active) {
        if (entry.lastUsed < lruTime) {
          lruTime = entry.lastUsed;
          lruKey = key;
        }
      }
      if (lruKey) {
        this.release(lruKey);
      }
    }

    const addon = new WebglAddon();
    addon.onContextLoss(() => {
      this.release(tabId);
      console.warn('WebGL context lost for', tabId);
    });

    try {
      terminal.loadAddon(addon);
    } catch (e) {
      console.warn('WebGL not available, falling back to canvas renderer', e);
      addon.dispose();
      return;
    }

    this.active.set(tabId, { terminal, addon, lastUsed: Date.now() });
  }

  release(tabId: string): void {
    const entry = this.active.get(tabId);
    if (entry) {
      try {
        entry.addon.dispose();
      } catch (_) {
        // ignore disposal errors
      }
      this.active.delete(tabId);
    }
  }
}

export const webglPool = new WebGLPool();
