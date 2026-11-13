import { useEffect, type RefObject } from 'react';

/** Offene Fallen, zuletzt geöffnete zuletzt: nur die oberste (z. B. Bestätigung über Termin-Dialog) reagiert. */
const stack: HTMLElement[] = [];

/** Ist dieses Element der oberste offene Dialog? */
export function isTopDialog(el: HTMLElement | null) {
  return !!el && stack[stack.length - 1] === el;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Hält den Fokus in einem modalen Dialog: Tab/Shift+Tab laufen im Kreis, der Anfangsfokus
 * kommt von `initialFocus` (sonst das erste Element), und beim Schließen geht der Fokus
 * zurück an das Element, das ihn vorher hatte. `key` startet die Falle neu, wenn der
 * Dialog bei gleichem `active` einen anderen Inhalt bekommt.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, initialFocus?: () => HTMLElement | null | undefined, key?: unknown) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const prev = document.activeElement as HTMLElement | null;
    stack.push(root);
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    (initialFocus?.() ?? items()[0] ?? root).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !isTopDialog(root)) return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const cur = document.activeElement;
      if (!root!.contains(cur)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && cur === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && cur === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      const i = stack.lastIndexOf(root);
      if (i >= 0) stack.splice(i, 1);
      if (prev && document.contains(prev)) prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen bzw. Inhaltswechsel
  }, [active, key]);
}
