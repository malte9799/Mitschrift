import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, type Note, type NotePatch } from '@/storage';
import { notifyNotesChanged } from './useNotes';

/** Lädt eine Notiz und speichert Änderungen debounced – Port von useArticleAutosave. */
export function useNote(id: string, delay = 400) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<NotePatch>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    storage
      .getNote(id)
      .then((n) => !cancelled && setNote(n ?? null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await storage.updateNote(id, patch);
    setSaved(true);
    notifyNotesChanged();
  }, [id]);

  const save = useCallback(
    (patch: NotePatch) => {
      setNote((prev) => (prev ? { ...prev, ...patch } : prev));
      pending.current = { ...pending.current, ...patch };
      setSaved(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  // Beim Wechsel der Notiz/Unmount ausstehende Änderungen sofort schreiben.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  return { note, loading, saved, save };
}
