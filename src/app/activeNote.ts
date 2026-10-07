import { useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/storage';

/** Was die geöffnete Notiz der Menüleiste zur Verfügung stellt. */
export interface ActiveNote {
  note: Note;
  editor: Editor | null;
  saved: boolean;
  learning: boolean;
  setLearning: (learning: boolean) => void;
  panelOpen: boolean;
  togglePanel: () => void;
  toggleStar: () => void;
  /** Notiz als Vorlage für neue Notizen merken bzw. das wieder aufheben. */
  toggleTemplate: () => void;
  remove: () => void;
  /** Präsentation starten – am Anfang oder auf der Folie mit der Schreibmarke. */
  present: (fromCursor?: boolean) => void;
}

let current: ActiveNote | null = null;
const listeners = new Set<() => void>();

/** Die Notizseite meldet sich hier an (und mit `null` wieder ab). */
export function setActiveNote(next: ActiveNote | null) {
  current = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useActiveNote() {
  return useSyncExternalStore(subscribe, () => current);
}

/** Event, mit dem die Menüleiste das Suchfeld der Seitenleiste fokussiert. */
export const FOCUS_SEARCH_EVENT = 'mitschrift:focus-search';
