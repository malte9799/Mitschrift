import { useSyncExternalStore } from 'react';

/**
 * Dev-Schalter für die neue Block-Leiste (fix am unteren Rand, Unteroptionen ersetzen die
 * Leiste statt eigener Popover). Nur auf dem Dev-Server verfügbar, per Konsole umschaltbar:
 * `localStorage.setItem('mitschrift-bar-mode', 'pinned')` (oder 'floating'), dann neu laden –
 * oder `window.__barMode('pinned' | 'floating')` für den sofortigen Wechsel ohne Reload.
 */
const KEY = 'mitschrift-bar-mode';
export type BarMode = 'floating' | 'pinned';

const listeners = new Set<() => void>();

function read(): BarMode {
  if (!import.meta.env.DEV) return 'floating';
  try {
    return localStorage.getItem(KEY) === 'pinned' ? 'pinned' : 'floating';
  } catch {
    return 'floating';
  }
}

let mode = read();

function set(next: BarMode) {
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* Speicher gesperrt */
  }
  for (const fn of listeners) fn();
}

export function useBarMode(): BarMode {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => mode,
  );
}

if (import.meta.env.DEV) {
  (window as unknown as { __barMode: (m: BarMode) => void }).__barMode = (m: BarMode) => set(m === 'pinned' ? 'pinned' : 'floating');
}
