import { useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBlockBar } from '@/editor/BlockBar';
import { navigateTo } from '@/app/noteLinks';
import { openTermDialog, useTerms } from '@/glossary/store';
import { termsInText } from '@/glossary/match';
import type { GlossaryScope } from './GlossaryListNode';

/** Text der Notiz, aktualisiert nach kurzer Tipp-Pause. */
function useDocText(editor: NodeViewProps['editor']) {
  const [text, setText] = useState(() => editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' '));
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(t);
      t = setTimeout(() => setText(editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')), 400);
    };
    editor.on('update', update);
    return () => {
      clearTimeout(t);
      editor.off('update', update);
    };
  }, [editor]);
  return text;
}

export function GlossaryListView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const terms = useTerms();
  const text = useDocText(editor);
  const scope = node.attrs.scope as GlossaryScope;
  const title = node.attrs.title as string;

  const list = useMemo(() => {
    if (!terms) return [];
    return scope === 'all' ? terms : termsInText(terms, text);
  }, [terms, text, scope]);

  return (
    <NodeViewWrapper className="b-block b-glossary" data-interactive="">
      {bar.render(
        <>
          <BarButton icon="file" label="Nur Begriffe aus dieser Notiz" text="Diese Notiz" active={scope === 'note'} onClick={() => updateAttributes({ scope: 'note' })} />
          <BarButton icon="book" label="Alle Begriffe des Glossars" text="Alle" active={scope === 'all'} onClick={() => updateAttributes({ scope: 'all' })} />
          <BarSep />
          <BarButton icon="external" label="Glossar öffnen" text="Glossar" onClick={() => navigateTo('/glossar')} />
        </>,
      )}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="book" /> {scope === 'note' ? 'Begriffe dieser Notiz' : 'Ganzes Glossar'}
          </span>
          {!editable && (
            <button type="button" className="b-chip-btn" onClick={() => navigateTo('/glossar')}>
              <Icon name="external" /> Glossar
            </button>
          )}
        </div>
        {editable ? (
          <input className="b-diagram-title-input" value={title} placeholder="Titel (optional)" onChange={(e) => updateAttributes({ title: e.target.value })} />
        ) : (
          title && <h4 className="b-diagram-title">{title}</h4>
        )}
        {terms === null ? null : list.length === 0 ? (
          <p className="b-empty">
            {scope === 'note' ? 'In dieser Notiz kommt noch kein Glossar-Begriff vor. Text markieren → „Als Begriff“ legt einen an.' : 'Das Glossar ist noch leer.'}
          </p>
        ) : (
          <dl className="b-glossary-list">
            {list.map((t) => (
              <div key={t.id} className="b-glossary-row">
                <dt>
                  <button type="button" onClick={() => editable && openTermDialog({ id: t.id })} disabled={!editable}>
                    {t.term}
                  </button>
                </dt>
                <dd>
                  {t.expansion || <em>—</em>}
                  {t.definition && <span>{t.definition}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </NodeViewWrapper>
  );
}
