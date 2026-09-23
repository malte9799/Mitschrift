import { useEffect, useState } from 'react';

export function isDark() {
  return getComputedStyle(document.documentElement).colorScheme.includes('dark');
}

/** Beobachtet Hell/Dunkel (System oder data-theme), damit Diagramme und Whiteboards mitwechseln. */
export function useDarkMode() {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, []);
  return dark;
}
