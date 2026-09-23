import { useSyncExternalStore } from 'react';

/** „light“/„dark“ bleiben die Basis (folgen ggf. dem System); die Paletten sind eigenständige, handgebaute Themes. */
export type Theme = 'light' | 'dark' | 'system' | 'mist' | 'linen' | 'sepia' | 'graphite' | 'slate' | 'midnight';

export const themeMeta: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'Automatisch' },
  { value: 'mist', label: 'Mist' },
  { value: 'linen', label: 'Linen' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'graphite', label: 'Graphite' },
  { value: 'slate', label: 'Slate' },
  { value: 'midnight', label: 'Midnight' },
];

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return (localStorage.getItem('mitschrift-theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}

let current: Theme = read();

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Helligkeit (0–1) des Papier-Tokens – der Token selbst wird nicht animiert, liefert also sofort den Zielwert. */
function paperLuminance(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  let rgb: number[] | null = null;
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  } else {
    rgb = v.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null;
  }
  if (!rgb) return 1;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Richtung des Wechsels an <html> vermerken: Von dunkel nach hell blendet langsamer über,
 * damit die helle Fläche nicht blendet (Dauern in tokens.css).
 */
function markDirection(before: number) {
  document.documentElement.dataset.themeFade = paperLuminance() > before + 0.15 ? 'to-light' : 'default';
}

/** Farben per CSS-Übergang animieren (Browser ohne View Transitions, System-Wechsel). */
function fadeColors(before: number, apply?: () => void) {
  const root = document.documentElement;
  root.classList.add('theme-fading');
  apply?.();
  markDirection(before);
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    root.classList.remove('theme-fading');
    delete root.dataset.themeFade;
  }, 1000);
}
let fadeTimer: ReturnType<typeof setTimeout>;

/** Wendet eine Änderung am Farbschema weich überblendet an statt schlagartig. */
function withTransition(apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (reducedMotion()) return apply();
  const before = paperLuminance();
  if (doc.startViewTransition) {
    const t = doc.startViewTransition(() => {
      apply();
      markDirection(before);
    });
    t.finished.finally(() => delete document.documentElement.dataset.themeFade);
    return;
  }
  fadeColors(before, apply);
}

// „Automatisch“: Wechselt das System zwischen hell und dunkel, ebenfalls überblenden.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkQuery.addEventListener('change', (e) => {
  // Die Farben sind hier schon umgestellt – die vorherige Helligkeit folgt aus der Richtung.
  if (current === 'system' && !reducedMotion()) fadeColors(e.matches ? 1 : 0);
});

/** Setzt das Farbschema global – Seitenleiste und Menüleiste teilen sich diesen Zustand. */
export function setTheme(theme: Theme) {
  if (theme === current) return;
  withTransition(() => applyTheme(theme));
}

function applyTheme(theme: Theme) {
  current = theme;
  const root = document.documentElement;
  try {
    if (theme === 'system') {
      delete root.dataset.theme;
      localStorage.removeItem('mitschrift-theme');
    } else {
      root.dataset.theme = theme;
      localStorage.setItem('mitschrift-theme', theme);
    }
  } catch {
    /* Speicher gesperrt – Theme gilt nur für diese Sitzung */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Theme-Umschalter: Hell/Dunkel/Automatisch plus handgebaute Paletten. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  const next = () => setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system');
  return { theme, next, setTheme };
}
