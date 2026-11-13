import { Suspense, useEffect, useReducer, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { EDIT_INLINE_EVENT, openInlineEditor, type EditInlineDetail } from './inlineEdit';
import { listFootnotes } from './Footnote';
import { LazyMathEditor } from './math/lazyMathEditor';
import { formatShortcut } from '@/ui/shortcut';

/** Welches Attribut der Popover bearbeitet. */
const FIELD: Record<string, 'latex' | 'text'> = { mathInline: 'latex', footnote: 'text' };

/**
 * Bearbeiten-Popover für Inline-Formeln und Fußnoten. Änderungen wirken sofort im Text;
 * Enter oder Klick daneben schließt, leer geschlossen wird der Knoten entfernt.
 */
export function InlineAtomEditor({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<number | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const { editor: target, pos: at } = (e as CustomEvent<EditInlineDetail>).detail;
      if (target === editor) setPos(at);
    };
    window.addEventListener(EDIT_INLINE_EVENT, onOpen);
    return () => window.removeEventListener(EDIT_INLINE_EVENT, onOpen);
  }, [editor]);

  useEffect(() => {
    if (pos === null) return;
    editor.on('transaction', rerender);
    return () => {
      editor.off('transaction', rerender);
    };
  }, [editor, pos]);

  const node = pos !== null ? editor.state.doc.nodeAt(pos) : null;
  const field = node ? FIELD[node.type.name] : undefined;
  const anchor = pos !== null && field ? editor.view.nodeDOM(pos) : null;

  // Knoten weg (Rückgängig, gelöscht): Popover schließen.
  useEffect(() => {
    if (pos !== null && !(anchor instanceof HTMLElement)) setPos(null);
  });

  if (pos === null || !node || !field || !(anchor instanceof HTMLElement)) return null;
  const isMath = field === 'latex';
  const value = node.attrs[field] as string;

  const set = (v: string) => editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, [field]: v }));

  /** Schließen; Schreibmarke hinter den Knoten, ein leerer Knoten wird entfernt. */
  function close(remove = false) {
    setPos(null);
    const cur = pos === null ? null : editor.state.doc.nodeAt(pos);
    if (pos === null || !cur || cur.type !== node!.type) return;
    const tr = editor.state.tr;
    let after = pos + cur.nodeSize;
    if (remove || !String(cur.attrs[field!]).trim()) {
      tr.delete(pos, after);
      after = pos;
    }
    tr.setSelection(TextSelection.create(tr.doc, after));
    editor.view.dispatch(tr);
    editor.view.focus();
  }

  const number = isMath ? 0 : listFootnotes(editor.state.doc).findIndex((f) => f.pos === pos) + 1;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      close();
    }
  };

  return (
    <Popover key={pos} anchor={anchor} onClose={() => close()} className={`c-inline-edit${isMath ? ' is-math' : ''}`}>
      <div className="c-inline-edit-head">
        <span>{isMath ? 'Formel (LaTeX)' : `Fußnote ${number}`}</span>
        <button type="button" aria-label="Entfernen" title="Entfernen" onClick={() => close(true)}>
          <Icon name="trash" />
        </button>
      </div>
      {isMath ? (
        <Suspense fallback={<p className="c-inline-edit-hint">Formel-Editor wird geladen …</p>}>
          <LazyMathEditor latex={value} display={false} onChange={set} onDone={() => close()} />
        </Suspense>
      ) : (
        <textarea
          autoFocus
          className="b-pop-input"
          value={value}
          rows={3}
          placeholder="Quelle oder Anmerkung …"
          onChange={(e) => set(e.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
      {!isMath && <p className="c-inline-edit-hint">{formatShortcut('↵ Fertig · ⇧↵ neue Zeile')}</p>}
    </Popover>
  );
}

/** Fußnoten gesammelt unter der Notiz; Klick springt zum Verweis und öffnet ihn. */
/** Fußnoten des Dokuments, aktualisiert bei jeder Änderung. */
export function useFootnotes(editor: Editor | null) {
  const [notes, setNotes] = useState(() => (editor ? listFootnotes(editor.state.doc) : []));

  useEffect(() => {
    if (!editor) {
      setNotes([]);
      return;
    }
    const update = () =>
      setNotes((prev) => {
        const next = listFootnotes(editor.state.doc);
        return next.length === prev.length && next.every((n, i) => n.pos === prev[i].pos && n.text === prev[i].text) ? prev : next;
      });
    update();
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);

  return notes;
}

/** Fußnoten als Gruppe im gemeinsamen Notiz-Fußbereich (neben Unterseiten und Rückverweisen). */
export function FootnoteList({ editor, notes }: { editor: Editor; notes: ReturnType<typeof listFootnotes> }) {
  if (notes.length === 0) return null;

  function jump(pos: number) {
    const el = editor.view.nodeDOM(pos);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center' });
    // Erst nach dem Scrollen öffnen, sonst schließt das Scroll-Event den Popover gleich wieder.
    if (editor.isEditable) setTimeout(() => openInlineEditor(editor, pos), 120);
  }

  return (
    <div className="note-rel-group c-footnotes" aria-label="Fußnoten">
      <h4>
        Fußnoten<span>{notes.length}</span>
      </h4>
      <ol>
        {notes.map((n) => (
          <li key={n.pos}>
            <button type="button" onClick={() => jump(n.pos)}>
              {n.text.trim() ? n.text : <em>leer</em>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
