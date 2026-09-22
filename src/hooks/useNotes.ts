import { useEffect, useState } from 'react';
import { storage, type Note } from '@/storage';

const listeners = new Set<() => void>();

/** Signalisiert allen Listen, dass sich Notizen geändert haben. */
export function notifyNotesChanged() {
  for (const l of listeners) l();
}

/** Alle Notizen, neueste Änderung zuerst; aktualisiert sich bei jeder Änderung. */
export function useNotes() {
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => storage.listNotes().then((n) => alive && setNotes(n));
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, []);

  return notes;
}
