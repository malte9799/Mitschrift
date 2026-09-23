import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return (localStorage.getItem('mitschrift-theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}

let current: Theme = read();

/** Setzt das Farbschema global – Seitenleiste und Menüleiste teilen sich diesen Zustand. */
export function setTheme(theme: Theme) {
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

/** Hell/Dunkel-Umschalter; „system“ folgt prefers-color-scheme. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  const next = () => setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system');
  return { theme, next, setTheme };
}
