import { Component, createEffect } from 'solid-js';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface Props {
  content: string | null;
  mode: 'unified' | 'split';
}

const DiffViewer: Component<Props> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!containerRef) return;

    const content = props.content;
    if (!content) {
      containerRef.innerHTML = '';
      return;
    }

    const diffHtml = html(content, {
      outputFormat: props.mode === 'split' ? 'side-by-side' : 'line-by-line',
      drawFileList: false,
    });

    containerRef.innerHTML = diffHtml;
  });

  return (
    <div class="diff-viewer">
      {props.content === null ? (
        <div class="diff-viewer__empty">Select a file to view changes</div>
      ) : (
        <div class="diff-viewer__content" ref={containerRef} />
      )}
    </div>
  );
};

export default DiffViewer;
