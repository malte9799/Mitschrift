import { useSyncExternalStore } from 'react';

/** Syntax-Highlighting-Theme für Codeblöcke – unabhängig vom App-Theme. „auto“ folgt dem App-Theme. */
export type CodeTheme =
  | 'auto'
  | 'atom-one'
  | 'aura'
  | 'bbedit'
  | 'darcula'
  | 'dracula'
  | 'github-dark'
  | 'github-light'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'material-dark'
  | 'material-light'
  | 'noctis-lilac'
  | 'nord'
  | 'sublime'
  | 'tokyo-night'
  | 'tokyo-night-day'
  | 'tokyo-night-storm'
  | 'vscode-dark';

export const codeThemeMeta: { value: CodeTheme; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'atom-one', label: 'Atom One' },
  { value: 'aura', label: 'Aura' },
  { value: 'bbedit', label: 'BBEdit' },
  { value: 'darcula', label: 'Darcula' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'github-light', label: 'GitHub Light' },
  { value: 'gruvbox-dark', label: 'Gruvbox Dark' },
  { value: 'gruvbox-light', label: 'Gruvbox Light' },
  { value: 'material-dark', label: 'Material Dark' },
  { value: 'material-light', label: 'Material Light' },
  { value: 'noctis-lilac', label: 'Noctis Lilac' },
  { value: 'nord', label: 'Nord' },
  { value: 'sublime', label: 'Sublime' },
  { value: 'tokyo-night', label: 'Tokyo Night' },
  { value: 'tokyo-night-day', label: 'Tokyo Night Day' },
  { value: 'tokyo-night-storm', label: 'Tokyo Night Storm' },
  { value: 'vscode-dark', label: 'VS Code Dark' },
];

const STORAGE_KEY = 'mitschrift-code-theme';
const listeners = new Set<() => void>();

function read(): CodeTheme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as CodeTheme) || 'auto';
  } catch {
    return 'auto';
  }
}

let current: CodeTheme = read();

/** Setzt das Syntax-Highlighting-Theme für alle Codeblöcke der App. */
export function setCodeTheme(theme: CodeTheme) {
  current = theme;
  const root = document.documentElement;
  try {
    if (theme === 'auto') {
      delete root.dataset.codeTheme;
      localStorage.removeItem(STORAGE_KEY);
    } else {
      root.dataset.codeTheme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
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

export function useCodeTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, setCodeTheme };
}
