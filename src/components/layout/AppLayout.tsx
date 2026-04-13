import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import SessionsPanel from '../sessions/SessionsPanel';
import NewSessionDialog from '../sessions/NewSessionDialog';
import TerminalArea from '../terminal/TerminalArea';
import ChangesPanel from '../changes/ChangesPanel';
import PanelResizer from './PanelResizer';
import PanelContainer from './PanelContainer';
import { addSession, sessionState } from '../../stores/sessionStore';
import { addTab } from '../../stores/terminalStore';
import type { Tab } from '../../stores/terminalStore';
import { layout, loadLayout, saveLayout, updateLayout } from '../../stores/settingsStore';

const LEFT_MIN = 120;
const RIGHT_MIN = 160;

const isInputFocused = (e: KeyboardEvent): boolean => {
  const target = e.target as HTMLElement;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.contentEditable === 'true'
  );
};

const AppLayout: Component = () => {
  const [newDialogOpen, setNewDialogOpen] = createSignal(false);

  onMount(() => {
    loadLayout();
    window.addEventListener('keydown', handleKeyDown, true);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown, true);
  });

  const openNewTabForActiveSession = () => {
    const id = sessionState.activeSessionId;
    if (!id) return;
    const session = sessionState.sessions.find((s) => s.id === id);
    if (!session || session.status === 'finished') return;
    const tab: Tab = { id: crypto.randomUUID(), sessionId: id, title: 'bash' };
    addTab(id, tab);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isInputFocused(e)) return;
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      e.stopPropagation();
      setNewDialogOpen(true);
    }
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      e.stopPropagation();
      openNewTabForActiveSession();
    }
  };

  const handleAddSession = async (branchName: string) => {
    await addSession(branchName);
    setNewDialogOpen(false);
  };

  // Left panel resize
  const handleLeftResize = (delta: number) => {
    const next = Math.max(LEFT_MIN, layout.leftWidth + delta);
    updateLayout({ leftWidth: next });
  };

  const handleLeftResizeEnd = () => {
    saveLayout();
  };

  const handleLeftToggle = () => {
    updateLayout({ leftCollapsed: !layout.leftCollapsed });
    saveLayout();
  };

  // Right panel resize
  const handleRightResize = (delta: number) => {
    // Right resizer: dragging right shrinks the panel, so negate delta
    const next = Math.max(RIGHT_MIN, layout.rightWidth - delta);
    updateLayout({ rightWidth: next });
  };

  const handleRightResizeEnd = () => {
    saveLayout();
  };

  const handleRightToggle = () => {
    updateLayout({ rightCollapsed: !layout.rightCollapsed });
    saveLayout();
  };

  return (
    <>
      <style>{`
        .app-layout {
          display: flex;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        .panel-center {
          flex: 1;
          min-width: 200px;
          background-color: var(--color-bg-primary);
          overflow: hidden;
        }
      `}</style>
      <div class="app-layout">
        <PanelContainer
          collapsed={layout.leftCollapsed}
          onToggle={handleLeftToggle}
          width={layout.leftWidth}
          minWidth={LEFT_MIN}
          side="left"
        >
          <SessionsPanel />
        </PanelContainer>

        <PanelResizer onResize={handleLeftResize} onResizeEnd={handleLeftResizeEnd} />

        <main class="panel-center">
          <TerminalArea />
        </main>

        <PanelResizer onResize={handleRightResize} onResizeEnd={handleRightResizeEnd} />

        <PanelContainer
          collapsed={layout.rightCollapsed}
          onToggle={handleRightToggle}
          width={layout.rightWidth}
          minWidth={RIGHT_MIN}
          side="right"
        >
          <ChangesPanel />
        </PanelContainer>
      </div>

      <NewSessionDialog
        isOpen={newDialogOpen()}
        onClose={() => setNewDialogOpen(false)}
        onSubmit={handleAddSession}
      />
    </>
  );
};

export default AppLayout;
