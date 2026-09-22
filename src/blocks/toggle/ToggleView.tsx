import { useEffect, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';

export function ToggleView({ node, editor, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const [open, setOpen] = useState<boolean>(editable ? node.attrs.open : false);

  useEffect(() => {
    setOpen(editable ? node.attrs.open : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Moduswechsel zurücksetzen
  }, [editable]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (editable) updateAttributes({ open: next });
  }

  const summary = node.attrs.summary as string;

  return (
    <NodeViewWrapper className={`b-toggle${open ? ' is-open' : ''}`} data-interactive="">
      <div className="b-toggle-head" contentEditable={false}>
        <button type="button" className="b-toggle-chevron" onClick={toggle} aria-expanded={open} aria-label={open ? 'Zuklappen' : 'Aufklappen'}>
          <Icon name="chevron" />
        </button>
        {editable ? (
          <input
            className="b-toggle-summary"
            value={summary}
            placeholder="Frage oder Titel …"
            onChange={(e) => updateAttributes({ summary: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (!open) toggle();
                // Cursor in den ersten Absatz des Inhalts setzen.
                requestAnimationFrame(() => {
                  const pos = editor.view.posAtDOM(e.currentTarget.closest('.b-toggle')!.querySelector('[data-node-view-content]')!, 0);
                  editor.chain().focus().setTextSelection(pos + 1).run();
                });
              }
            }}
          />
        ) : (
          <button type="button" className="b-toggle-summary" onClick={toggle}>
            {summary || 'Aufklappen'}
            {!open && <span className="b-toggle-hint">Antwort zeigen</span>}
          </button>
        )}
      </div>
      <div className="b-toggle-body" aria-hidden={!open}>
        <NodeViewContent className="b-toggle-content" />
      </div>
    </NodeViewWrapper>
  );
}
