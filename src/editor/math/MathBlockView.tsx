import { Suspense, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { renderMath } from './katex';
import { LazyMathEditor } from './lazyMathEditor';

/** Abgesetzte Formel: zeigt die gesetzte Formel, Klick auf die markierte Formel öffnet den Formel-Editor. */
export function MathBlockView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const latex = node.attrs.latex as string;
  const [editing, setEditing] = useState(() => !latex.trim());
  const outRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outRef.current) renderMath(outRef.current, latex, true);
  }, [latex, editing]);

  // Klick außerhalb (auch nicht in der Optionsleiste) schließt den Editor.
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!wrapRef.current?.contains(t) && !t.closest?.('.c-block-bar')) setEditing(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editing]);

  function done() {
    setEditing(false);
    editor.commands.focus();
  }

  const showEditor = editable && editing;

  return (
    <NodeViewWrapper className="b-math" data-interactive="">
      {bar.render(
        <BarButton icon={showEditor ? 'check' : 'formula'} label={showEditor ? 'Fertig' : 'Formel bearbeiten'} text={showEditor ? 'Fertig' : 'Bearbeiten'} active={showEditor} onClick={() => (showEditor ? done() : setEditing(true))} />,
      )}
      <div ref={wrapRef} contentEditable={false}>
        {!showEditor && (
          <div
            ref={outRef}
            className={`b-math-out${editable ? ' is-editable' : ''}`}
            title={editable ? 'Klicken zum Bearbeiten' : undefined}
            onClick={() => editable && setEditing(true)}
          />
        )}
        {showEditor && (
          <div className="b-math-editor">
            <Suspense fallback={<p className="b-math-hint">Formel-Editor wird geladen …</p>}>
              <LazyMathEditor latex={latex} display onChange={(v) => updateAttributes({ latex: v })} onDone={done} />
            </Suspense>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
