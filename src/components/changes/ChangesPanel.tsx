import { Channel } from '@tauri-apps/api/core';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { getChanges, getDiff, getInotifyWarning, startWatching, stopWatching } from '../../lib/tauri';
import type { WatcherEvent } from '../../lib/types';
import { activeSession } from '../../stores/sessionStore';
import { changes, clearChanges, updateChanges } from '../../stores/changesStore';
import ErrorBanner from '../shared/ErrorBanner';
import FileChangeItem from './FileChangeItem';
import DiffViewer from './DiffViewer';

const ChangesPanel: Component = () => {
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);
  const [diffContent, setDiffContent] = createSignal<string | null>(null);
  const [diffMode, setDiffMode] = createSignal<'unified' | 'split'>('unified');
  const [activeWatcherSessionId, setActiveWatcherSessionId] = createSignal<string | null>(null);
  const [inotifyWarning, setInotifyWarning] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const warning = await getInotifyWarning();
      if (warning) setInotifyWarning(warning);
    } catch {
      // Non-critical — ignore.
    }
  });

  // React to active session changes.
  createEffect(async () => {
    const session = activeSession();

    // Stop the previous watcher if any.
    const prevId = activeWatcherSessionId();
    if (prevId) {
      try {
        await stopWatching(prevId);
      } catch {
        // Best effort — ignore if already stopped.
      }
      setActiveWatcherSessionId(null);
    }

    // Clear state from the previous session.
    clearChanges();
    setSelectedPath(null);
    setDiffContent(null);

    if (!session) return;

    const sessionId = session.id;
    const worktreePath = session.worktreePath;

    // Load initial status.
    try {
      const initial = await getChanges(worktreePath);
      updateChanges(initial);
    } catch (e) {
      console.warn('Failed to load initial changes:', e);
    }

    // Start watcher.
    const channel = new Channel<WatcherEvent>();
    channel.onmessage = (event) => {
      updateChanges(event.changes);
    };

    try {
      await startWatching(sessionId, worktreePath, channel);
      setActiveWatcherSessionId(sessionId);
    } catch (e) {
      console.warn('Failed to start watcher:', e);
    }
  });

  const handleFileClick = async (filePath: string) => {
    const session = activeSession();
    if (!session) return;

    setSelectedPath(filePath);
    setDiffContent(null);

    try {
      const diff = await getDiff(session.worktreePath, filePath);
      setDiffContent(diff);
    } catch (e) {
      console.warn('Failed to get diff:', e);
      setDiffContent('');
    }
  };

  onCleanup(async () => {
    const prevId = activeWatcherSessionId();
    if (prevId) {
      try {
        await stopWatching(prevId);
      } catch {
        // ignore
      }
    }
  });

  return (
    <div class="changes-panel">
      <Show when={inotifyWarning()}>
        {(warning) => (
          <ErrorBanner
            message={warning()}
            level="warning"
            onDismiss={() => setInotifyWarning(null)}
          />
        )}
      </Show>
      <div class="changes-panel__header">
        <span class="changes-panel__title">Changes</span>
        <div class="changes-panel__mode-toggle">
          <button
            class="mode-btn"
            classList={{ 'mode-btn--active': diffMode() === 'unified' }}
            onClick={() => setDiffMode('unified')}
          >
            Unified
          </button>
          <button
            class="mode-btn"
            classList={{ 'mode-btn--active': diffMode() === 'split' }}
            onClick={() => setDiffMode('split')}
          >
            Split
          </button>
        </div>
      </div>

      <div class="changes-panel__body">
        <Show
          when={activeSession()}
          fallback={
            <div class="changes-panel__empty">Select a session to view changes.</div>
          }
        >
          <div class="changes-panel__file-list">
            {changes().length === 0 ? (
              <div class="changes-panel__empty">No changes detected</div>
            ) : (
              <For each={changes()}>
                {(change) => (
                  <FileChangeItem
                    change={change}
                    isSelected={selectedPath() === change.path}
                    onClick={() => handleFileClick(change.path)}
                  />
                )}
              </For>
            )}
          </div>

          <div class="changes-panel__diff">
            <DiffViewer content={diffContent()} mode={diffMode()} />
          </div>
        </Show>
      </div>
    </div>
  );
};

export default ChangesPanel;
