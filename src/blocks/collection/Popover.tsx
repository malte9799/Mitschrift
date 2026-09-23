import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  /** Mindestens so breit wie der Anker (Auswahlfelder). */
  matchWidth?: boolean;
}

/**
 * Schwebendes Menü am Anker-Element. Liegt im body, damit es nicht vom
 * scrollbaren Tabellenbereich abgeschnitten wird; schließt bei Klick außerhalb,
 * Escape und beim Scrollen der Seite. Popover können verschachtelt werden: Klicks und
 * Scrollen in einem später geöffneten (inneren) Popover schließen das äußere nicht,
 * Escape schließt nur das oberste.
 */
export function Popover({ anchor, onClose, children, className = '', align = 'start', matchWidth = false }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState<{ top: number; left: number; minWidth?: number } | null>(null);

  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = Math.max(ref.current?.offsetWidth ?? 240, matchWidth ? r.width : 0);
    const h = ref.current?.offsetHeight ?? 200;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    // Unten zu wenig Platz: über dem Anker öffnen; passt beides nicht, so weit nach oben schieben, dass es ins Fenster passt.
    const fitsBelow = r.bottom + 6 + h <= window.innerHeight - 8;
    const fitsAbove = r.top - 6 - h >= 8;
    const top = fitsBelow ? r.bottom + 6 : fitsAbove ? r.top - 6 - h : Math.max(8, window.innerHeight - 8 - h);
    setPos({ top, left, minWidth: matchWidth ? r.width : undefined });
  }, [anchor, align, matchWidth]);

  useEffect(() => {
    /** Liegt das Ziel in diesem oder einem darin geöffneten Popover? */
    const inside = (t: Node) => {
      const me = ref.current;
      if (!me) return false;
      if (me.contains(t)) return true;
      const pop = t instanceof Element ? t.closest('.b-pop') : null;
      return !!pop && !!(me.compareDocumentPosition(pop) & Node.DOCUMENT_POSITION_FOLLOWING);
    };
    const isTopmost = () => {
      const pops = document.querySelectorAll('.b-pop');
      return pops[pops.length - 1] === ref.current;
    };
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (inside(t) || anchor.contains(t)) return;
      closeRef.current();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTopmost()) {
        e.stopPropagation();
        closeRef.current();
      }
    }
    function onScroll(e: Event) {
      if (inside(e.target as Node)) return;
      closeRef.current();
    }
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor]);

  return createPortal(
    <div ref={ref} className={`b-pop ${className}`} style={pos ? pos : { visibility: 'hidden', top: 0, left: 0 }}>
      {children}
    </div>,
    document.body,
  );
}
