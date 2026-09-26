import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { noteIdFromHref } from '@/app/noteLinks';
import { useEditable } from '../useEditable';
import { externalLinkToBlock } from './SmartLinkNode';
import { analyzeUrl, faviconUrl } from './urlPatterns';

const OPEN_DELAY = 380;
const CLOSE_DELAY = 220;

/** Vorschau beim Überfahren eines externen Links: Domain/Favicon – und im Bearbeiten-Modus ein Knopf, um ihn als Karte, Bild, Video oder Audio einzubetten. */
export function SmartLinkHover({ editor }: { editor: Editor }) {
  const editable = useEditable(editor);
  const [target, setTarget] = useState<{ el: HTMLAnchorElement; href: string } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    function onOver(e: MouseEvent) {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !dom.contains(a) || a.closest('.nb, .sl')) return;
      const href = a.getAttribute('href');
      if (!href || !/^https?:\/\//i.test(href) || noteIdFromHref(href)) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget({ el: a, href }), OPEN_DELAY);
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
    const w = cardRef.current?.offsetWidth ?? 240;
    const h = cardRef.current?.offsetHeight ?? 120;
    const below = r.bottom + 8 + h <= window.innerHeight - 8;
    setPos({
      top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h),
      left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
    });
  }, [target]);

  if (!target) return null;
  const info = analyzeUrl(target.href);
  const embedView = info.kind === 'generic' ? null : info.kind;

  const keepOpen = () => clearTimeout(timer.current);
  const scheduleClose = () => {
    timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
  };

  function embed(view: 'row' | 'image' | 'video' | 'audio') {
    const at = editor.view.posAtDOM(target!.el, 0);
    setTarget(null);
    externalLinkToBlock(editor, at, view);
  }

  return createPortal(
    <div ref={cardRef} className="sl-hover" style={pos ?? { visibility: 'hidden', top: 0, left: 0 }} onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
      <a href={target.href} target="_blank" rel="noreferrer noopener" className="sl-hover-main">
        <span className="sl-hover-icon">
          <img src={faviconUrl(info.domain)} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        </span>
        <span className="sl-hover-text">
          <span className="sl-hover-domain">{info.domain}</span>
          <span className="sl-hover-url">{target.href}</span>
        </span>
        <Icon name="external" />
      </a>
      {editable && (
        <div className="sl-hover-options">
          <button type="button" className="sl-hover-embed" onClick={() => embed('row')}>
            <Icon name="noteRow" /> Als Zeile
          </button>
          {embedView && (
            <button type="button" className="sl-hover-embed" onClick={() => embed(embedView)}>
              <Icon name={embedView === 'image' ? 'image' : embedView === 'video' ? 'play' : 'audio'} />
              {embedView === 'image' ? 'Als Bild' : embedView === 'video' ? 'Als Video' : 'Als Audio'}
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
