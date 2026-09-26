import { useSyncExternalStore } from 'react';
import type { CalendarSource } from '@/storage';

/** Integrationsquellen für den Kalender, je mit Anzeigename und ob sie schon nutzbar ist. */
export interface IntegrationMeta {
  source: Exclude<CalendarSource, 'manual'>;
  label: string;
  /** Kurzbeschreibung, z. B. in der Einrichtungs-Karte. */
  hint: string;
  /** Noch keine echte Anbindung (z. B. itslearning ohne API-Zugang) – zeigt nur einen Hinweis. */
  comingSoon?: boolean;
}

export const INTEGRATIONS: IntegrationMeta[] = [
  { source: 'untis', label: 'Untis', hint: 'Stundenplan aus WebUntis.' },
  { source: 'itslearning', label: 'itslearning', hint: 'Noch nicht angebunden – itslearning bietet keinen einfachen API-Zugang für Schüler-Konten.', comingSoon: true },
];

const VISIBLE_KEY = 'mitschrift-calendar-sources';

function loadVisible(): Set<CalendarSource> {
  try {
    const stored = JSON.parse(localStorage.getItem(VISIBLE_KEY) ?? 'null') as string[] | null;
    if (stored) return new Set(['manual', ...stored] as CalendarSource[]);
  } catch {
    /* ignorieren */
  }
  return new Set(['manual', 'untis', 'itslearning']);
}

let visible = loadVisible();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(VISIBLE_KEY, JSON.stringify([...visible].filter((s) => s !== 'manual')));
  } catch {
    /* ignorieren */
  }
}

export function isSourceVisible(source: CalendarSource) {
  return visible.has(source);
}

export function toggleSource(source: CalendarSource) {
  const next = new Set(visible);
  if (next.has(source)) next.delete(source);
  else next.add(source);
  visible = next;
  persist();
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Welche Kalenderquellen aktuell eingeblendet sind (immer inkl. `manual`). */
export function useVisibleSources(): Set<CalendarSource> {
  return useSyncExternalStore(subscribe, () => visible);
}
