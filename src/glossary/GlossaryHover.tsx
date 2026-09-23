import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { useTags } from '@/hooks/useTags';
import { navigateTo } from '@/app/noteLinks';
import { openTermDialog, useTerms } from './store';

const OPEN_DELAY = 280;
const CLOSE_DELAY = 200;

/** Erklärung beim Überfahren eines Glossar-Begriffs – auch im Lernmodus und in der Präsentation. */
export function GlossaryHover({ editor }: { editor: Editor }) {
  const terms = useTerms();
  const tags = useTags();
  const [target, setTarget] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    function onOver(e: MouseEvent) {
      const el = (e.target as Element).closest?.('.gl-term') as HTMLElement | null;
      if (!el || !dom.contains(el)) return;
      const id = el.dataset.term;
      if (!id) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget({ el, id }), OPEN_DELAY);
    }
    function onOut(e: MouseEvent) {
      if (!(e.target as Element).closest?.('.gl-term')) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
    }
    const close = () => {
      clearTimeout(timer.current);
      setTarget(null);
    };
    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    dom.addEventListener('keydown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      clearTimeout(timer.current);
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
      dom.removeEventListener('keydown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (!target) {
      setPos(null);
      return;
    }
    const r = target.el.getBoundingClientRect();
    const w = cardRef.current?.offsetWidth ?? 300;
    const h = cardRef.current?.offsetHeight ?? 120;
    const below = r.bottom + 8 + h <= window.innerHeight - 8;
    setPos({
      top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h),
      left: Math.max(8, Math.min(r.left - 12, window.innerWidth - w - 8)),
    });
  }, [target]);

  const term = target && terms?.find((t) => t.id === target.id);
  if (!target || !term) return null;

  const keepOpen = () => clearTimeout(timer.current);
  const scheduleClose = () => {
    timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
  };
  const termTags = (tags ?? []).filter((t) => term.tags.includes(t.id));

  return createPortal(
    <div ref={cardRef} className="gl-hover" style={pos ?? { visibility: 'hidden', top: 0, left: 0 }} onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
      <div className="gl-hover-head">
        <span className="gl-hover-term">{term.term}</span>
        {termTags.map((t) => (
          <TagChip key={t.id} tag={t} />
        ))}
      </div>
      {term.expansion && <p className="gl-hover-exp">{term.expansion}</p>}
      {term.definition && <p className="gl-hover-def">{term.definition}</p>}
      {!term.expansion && !term.definition && <p className="gl-hover-def is-empty">Noch keine Erklärung.</p>}
      <div className="gl-hover-actions">
        <button
          type="button"
          onClick={() => {
            setTarget(null);
            openTermDialog({ id: term.id });
          }}
        >
          <Icon name="pencil" /> Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => {
            setTarget(null);
            navigateTo(`/glossar?t=${encodeURIComponent(term.id)}`);
          }}
        >
          <Icon name="book" /> Im Glossar
        </button>
      </div>
    </div>,
    document.body,
  );
}
