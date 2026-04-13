import { Component, createSignal } from 'solid-js';

interface PanelResizerProps {
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
}

const PanelResizer: Component<PanelResizerProps> = (props) => {
  const [dragging, setDragging] = createSignal(false);
  let startX = 0;

  const onPointerDown = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startX = e.clientX;
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging()) return;
    const delta = e.clientX - startX;
    startX = e.clientX;
    props.onResize(delta);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging()) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    props.onResizeEnd();
  };

  return (
    <>
      <style>{`
        .panel-resizer {
          width: 4px;
          flex-shrink: 0;
          cursor: col-resize;
          background-color: var(--color-border);
          transition: background-color 0.15s;
          position: relative;
          z-index: 10;
        }
        .panel-resizer:hover,
        .panel-resizer--dragging {
          background-color: var(--color-accent);
        }
      `}</style>
      <div
        class="panel-resizer"
        classList={{ 'panel-resizer--dragging': dragging() }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </>
  );
};

export default PanelResizer;
