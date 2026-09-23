import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

/**
 * Schwebendes Menü am Anker-Element. Liegt im body, damit es nicht vom
 * scrollbaren Tabellenbereich abgeschnitten wird; schließt bei Klick außerhalb,
 * Escape und beim Scrollen der Seite.
 */
export function Popover({ anchor, onClose, children, className = '', align = 'start' }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = ref.current?.offsetWidth ?? 240;
    const h = ref.current?.offsetHeight ?? 200;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    // Unten zu wenig Platz: über dem Anker öffnen.
    const top = r.bottom + 6 + h > window.innerHeight - 8 && r.top - 6 - h > 8 ? r.top - 6 - h : r.bottom + 6;
    setPos({ top, left });
  }, [anchor, align]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      closeRef.current();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    }
    function onScroll(e: Event) {
      if (ref.current?.contains(e.target as Node)) return;
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
    <div ref={ref} className={`b-pop ${className}`} style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}>
      {children}
    </div>,
    document.body,
  );
}
