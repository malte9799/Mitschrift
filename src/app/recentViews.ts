import { useEffect, useState } from 'react';

const VIEWED_KEY = 'mitschrift-viewed';
const listeners = new Set<() => void>();

/**
 * Wann jede Notiz zuletzt geöffnet wurde (ID → Zeitstempel). Liegt bewusst nicht in der
 * Notiz selbst: Ansehen ist keine Bearbeitung und soll `updatedAt` nicht verschieben.
 */
export function loadViewed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(VIEWED_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function markViewed(id: string) {
  const all = loadViewed();
  all[id] = Date.now();
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(all));
  } catch {
    /* ignorieren */
  }
  for (const l of listeners) l();
}

/** Zeitstempel des letzten Öffnens je Notiz; aktualisiert sich bei jedem Öffnen. */
export function useViewed() {
  const [viewed, setViewed] = useState(loadViewed);
  useEffect(() => {
    const load = () => setViewed(loadViewed());
    listeners.add(load);
    return () => void listeners.delete(load);
  }, []);
  return viewed;
}
