import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/** Hell/Dunkel-Umschalter; „system“ folgt prefers-color-scheme. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('mitschrift-theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
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
  }, [theme]);

  const next = () => setTheme((t) => (t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'));
  return { theme, next };
}
