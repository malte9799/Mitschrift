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
  /** Rolle des Inhalts: Standard „dialog“ (gemischter Inhalt), „menu“ nur wenn es reine Menüeinträge sind. */
  role?: 'dialog' | 'menu';
  /** Zugänglicher Name; Standard: aria-label des Ankers. */
  label?: string;
}

/** Fokussierbare Elemente im Popover selbst (nicht in darin geöffneten Popovern). */
const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';
function ownFocusables(pop: HTMLElement, selector = FOCUSABLE) {
  return Array.from(pop.querySelectorAll<HTMLElement>(selector)).filter((el) => el.closest('.b-pop') === pop);
}

/**
 * Schwebendes Menü am Anker-Element. Liegt im body, damit es nicht vom
 * scrollbaren Tabellenbereich abgeschnitten wird; schließt bei Klick außerhalb,
 * Escape und beim Scrollen der Seite. Popover können verschachtelt werden: Klicks und
 * Scrollen in einem später geöffneten (inneren) Popover schließen das äußere nicht,
 * Escape schließt nur das oberste.
 */
export function Popover({ anchor, onClose, children, className = '', align = 'start', matchWidth = false, role = 'dialog', label }: PopoverProps) {
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

  // Fokus: beim Öffnen ins Popover (sobald es sichtbar ist), beim Schließen zurück an den Anker.
  const placed = pos !== null;
  useEffect(() => {
    const me = ref.current;
    if (!placed || !me) return;
    if (!me.contains(document.activeElement)) ownFocusables(me)[0]?.focus({ preventScroll: true });
  }, [placed]);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  useEffect(() => {
    const me = ref.current;
    return () => {
      const a = document.activeElement;
      const target = anchorRef.current;
      // Nur zurückgeben, wenn der Fokus sonst verloren ginge – nicht, wenn der Nutzer schon woanders hin geklickt hat.
      if ((!a || a === document.body || me?.contains(a)) && document.contains(target)) target.focus({ preventScroll: true });
    };
  }, []);

  /** Pfeiltasten zwischen den Einträgen (.b-pop-item), Home/Ende springen an die Ränder. */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const me = ref.current;
    const t = e.target as HTMLElement;
    // React-Events laufen durch Portale nach oben: nur Tasten aus diesem Popover selbst behandeln.
    if (!me || t.closest('.b-pop') !== me || !t.classList.contains('b-pop-item')) return;
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const items = ownFocusables(me, '.b-pop-item:not([disabled])');
    const i = items.indexOf(t);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }

  return createPortal(
    <div
      ref={ref}
      className={`b-pop ${className}`}
      role={role}
      aria-label={label ?? anchor.getAttribute('aria-label') ?? undefined}
      onKeyDown={onKeyDown}
      style={pos ? pos : { visibility: 'hidden', top: 0, left: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}
