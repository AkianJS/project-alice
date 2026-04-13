import { Component, JSX, Show } from 'solid-js';

interface PanelContainerProps {
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  minWidth: number;
  side: 'left' | 'right';
  children: JSX.Element;
}

const PanelContainer: Component<PanelContainerProps> = (props) => {
  // chevron direction: when collapsed, point outward (expand). When expanded, point inward (collapse).
  // left panel: collapsed → show ›, expanded → show ‹
  // right panel: collapsed → show ‹, expanded → show ›
  const chevron = () => {
    if (props.side === 'left') return props.collapsed ? '›' : '‹';
    return props.collapsed ? '‹' : '›';
  };

  const containerWidth = () => (props.collapsed ? '32px' : `${props.width}px`);

  return (
    <>
      <style>{`
        .panel-container {
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          background-color: var(--color-bg-secondary);
          transition: width 200ms ease;
        }
        .panel-container__toggle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--color-text-muted);
          font-size: var(--font-size-lg);
          line-height: 1;
          z-index: 20;
          padding: 0;
          transition: background-color 0.15s, color 0.15s;
          user-select: none;
        }
        .panel-container__toggle:hover {
          background-color: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }
        .panel-container--left .panel-container__toggle {
          right: -10px;
        }
        .panel-container--right .panel-container__toggle {
          left: -10px;
        }
        .panel-container__content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <div
        class="panel-container"
        classList={{
          'panel-container--left': props.side === 'left',
          'panel-container--right': props.side === 'right',
        }}
        style={{ width: containerWidth() }}
      >
        <button
          class="panel-container__toggle"
          onClick={props.onToggle}
          aria-label={props.collapsed ? 'Expand panel' : 'Collapse panel'}
          title={props.collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {chevron()}
        </button>
        <Show when={!props.collapsed}>
          <div class="panel-container__content">{props.children}</div>
        </Show>
      </div>
    </>
  );
};

export default PanelContainer;
