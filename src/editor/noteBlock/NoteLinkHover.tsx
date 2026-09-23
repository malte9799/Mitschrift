import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { navigateTo, noteHref, noteIdFromHref } from '@/app/noteLinks';
import { useEditable } from '../useEditable';
import { linkToBlock } from './NoteBlockNode';
import { NotePreview, noteExcerpt } from './NotePreview';
import { NoteViewOptions } from './NoteViewOptions';

const OPEN_DELAY = 380;
const CLOSE_DELAY = 220;

/**
 * Vorschau beim Überfahren eines internen Links: Mini-Seite, Titel, Textanfang –
 * und im Bearbeiten-Modus die Umschaltung auf Zeile oder Karte.
 */
export function NoteLinkHover({ editor }: { editor: Editor }) {
  const notes = useNotes();
  const editable = useEditable(editor);
  const [target, setTarget] = useState<{ el: HTMLAnchorElement; id: string } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    function onOver(e: MouseEvent) {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !dom.contains(a) || a.closest('.nb')) return;
      const id = noteIdFromHref(a.getAttribute('href'));
      if (!id) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget({ el: a, id }), OPEN_DELAY);
    }
    function onOut(e: MouseEvent) {
      const a = (e.target as Element).closest?.('a[href]');
      if (!a) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
    }
    const close = () => {
      clearTimeout(timer.current);
      setTarget(null);
    };
    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    dom.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    editor.on('update', close);
    return () => {
      clearTimeout(timer.current);
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
      dom.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      editor.off('update', close);
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (!target) {
      setPos(null);
      return;
    }
    const r = target.el.getBoundingClientRect();
    const w = cardRef.current?.offsetWidth ?? 280;
    const h = cardRef.current?.offsetHeight ?? 260;
    const below = r.bottom + 8 + h <= window.innerHeight - 8;
    setPos({
      top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h),
      left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
    });
  }, [target]);

  if (!target) return null;
  const note = notes?.find((n) => n.id === target.id);

  const keepOpen = () => clearTimeout(timer.current);
  const scheduleClose = () => {
    timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
  };

  return createPortal(
    <div
      ref={cardRef}
      className="nl-hover"
      style={pos ?? { visibility: 'hidden', top: 0, left: 0 }}
      onMouseEnter={keepOpen}
      onMouseLeave={scheduleClose}
    >
      {note ? (
        <button type="button" className="nl-hover-main" onClick={() => navigateTo(noteHref(note.id))}>
          <span className="nl-hover-preview">
            <NotePreview note={note} />
          </span>
          <span className="nl-hover-title">{note.title || 'Ohne Titel'}</span>
          {noteExcerpt(note, 110) && <span className="nl-hover-sub">{noteExcerpt(note, 110)}</span>}
        </button>
      ) : (
        <p className="nl-hover-missing">
          <Icon name="x" /> Diese Notiz gibt es nicht mehr.
        </p>
      )}
      {editable && note && (
        <div className="nl-hover-options">
          <NoteViewOptions
            view="link"
            size="m"
            onView={(v) => {
              if (v === 'link') return;
              const at = editor.view.posAtDOM(target.el, 0);
              setTarget(null);
              linkToBlock(editor, at, v, 'm');
            }}
            onSize={() => undefined}
          />
        </div>
      )}
    </div>,
    document.body,
  );
}
