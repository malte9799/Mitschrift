import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, type Note, type NotePatch } from '@/storage';
import { notifyNotesChanged } from './useNotes';
import { touchDraft } from '@/app/draftNotes';
import { emitStorageError } from '@/storage/changes';

/** Wartezeiten bis zum nächsten Versuch, wenn Speichern fehlschlägt (danach bleibt es beim Hinweis). */
const RETRY_DELAYS = [1000, 3000, 8000, 20000, 60000];

/** Lädt eine Notiz und speichert Änderungen debounced – Port von useArticleAutosave. */
export function useNote(id: string, delay = 400) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  /** Letzter Speicherversuch gescheitert – Änderungen liegen noch im Speicher und werden erneut versucht. */
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<NotePatch>({});
  const attempt = useRef(0);

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

  const flush = useCallback(async (): Promise<void> => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    try {
      await storage.updateNote(id, patch);
    } catch (err) {
      // Nichts verwerfen: Patch zurücklegen (neuere Eingaben gewinnen) und später erneut versuchen.
      pending.current = { ...patch, ...pending.current };
      setFailed(true);
      emitStorageError(err);
      const delay = RETRY_DELAYS[attempt.current++];
      if (delay !== undefined) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), delay);
      }
      return;
    }
    attempt.current = 0;
    setFailed(false);
    if (Object.keys(pending.current).length === 0) setSaved(true);
    notifyNotesChanged();
  }, [id]);

  const save = useCallback(
    (patch: NotePatch) => {
      touchDraft(id);
      setNote((prev) => (prev ? { ...prev, ...patch } : prev));
      pending.current = { ...pending.current, ...patch };
      setSaved(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [id, flush, delay],
  );

  // Beim Wechsel der Notiz/Unmount ausstehende Änderungen sofort schreiben – ebenso, wenn der
  // Tab verborgen, neu geladen oder geschlossen wird (sonst ginge das Debounce-Fenster verloren).
  useEffect(() => {
    const flushNow = () => {
      clearTimeout(timer.current);
      void flush();
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flushNow();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, [flush]);

  return { note, loading, saved, failed, save };
}
