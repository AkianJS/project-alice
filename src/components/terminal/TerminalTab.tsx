import '@xterm/xterm/css/xterm.css';

import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Channel } from '@tauri-apps/api/core';
import type { PtyOutputEvent } from '../../lib/tauri';
import { openPty, writePty, resizePty, closePty } from '../../lib/tauri';
import { webglPool } from './WebGLPool';

interface TerminalTabProps {
  tabId: string;
  sessionId: string;
  cwd: string;
  isVisible: boolean;
}

const TerminalTab: Component<TerminalTabProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let terminal: Terminal | undefined;
  let fitAddon: FitAddon | undefined;
  let resizeObserver: ResizeObserver | undefined;

  onMount(() => {
    const styles = getComputedStyle(document.documentElement);
    const theme = {
      background: styles.getPropertyValue('--color-bg-primary').trim(),
      foreground: styles.getPropertyValue('--color-text-primary').trim(),
      cursor: styles.getPropertyValue('--color-accent').trim(),
      selectionBackground: styles.getPropertyValue('--color-bg-elevated').trim(),
      black: '#000000',
      red: styles.getPropertyValue('--color-error').trim(),
      green: styles.getPropertyValue('--color-status-running').trim(),
      yellow: styles.getPropertyValue('--color-warning').trim(),
      blue: styles.getPropertyValue('--color-accent').trim(),
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: styles.getPropertyValue('--color-text-secondary').trim(),
      brightBlack: '#5c6370',
      brightRed: styles.getPropertyValue('--color-error').trim(),
      brightGreen: styles.getPropertyValue('--color-status-running').trim(),
      brightYellow: styles.getPropertyValue('--color-warning').trim(),
      brightBlue: styles.getPropertyValue('--color-accent').trim(),
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: styles.getPropertyValue('--color-text-primary').trim(),
    };

    terminal = new Terminal({
      theme,
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef!);
    fitAddon.fit();

    const channel = new Channel<PtyOutputEvent>();
    channel.onmessage = (event) => {
      terminal!.write(new Uint8Array(event.data));
    };

    openPty(props.sessionId, props.tabId, props.cwd, terminal.cols, terminal.rows, channel).catch(
      (e) => console.error('openPty failed', e),
    );

    terminal.onData((data) => {
      const encoder = new TextEncoder();
      const bytes = Array.from(encoder.encode(data));
      writePty(props.tabId, bytes).catch((e) => console.error('writePty failed', e));
    });

    terminal.onResize(({ cols, rows }) => {
      resizePty(props.tabId, cols, rows).catch((e) => console.error('resizePty failed', e));
    });

    resizeObserver = new ResizeObserver(() => {
      fitAddon?.fit();
    });
    resizeObserver.observe(containerRef!);
  });

  createEffect(() => {
    if (props.isVisible) {
      webglPool.acquire(props.tabId, terminal!);
      fitAddon?.fit();
    } else {
      webglPool.release(props.tabId);
    }
  });

  onCleanup(() => {
    webglPool.release(props.tabId);
    closePty(props.tabId).catch(() => {});
    resizeObserver?.disconnect();
    terminal?.dispose();
  });

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: props.isVisible ? 'block' : 'none',
        overflow: 'hidden',
        'background-color': 'var(--color-bg-primary)',
      }}
    />
  );
};

export default TerminalTab;
