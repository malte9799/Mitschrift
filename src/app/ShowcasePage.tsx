import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { storage } from '@/storage';
import { SHOWCASE_TITLE, showcaseDoc } from './showcaseContent';

/** Merkt sich die ID der einmalig angelegten Showcase-Notiz, damit `/showcase` immer dieselbe öffnet. */
const STORAGE_KEY = 'mitschrift-showcase-note-id';

/**
 * Modulweit (statt im Effect) zwischengespeichert, damit React StrictMode – das den Effect doppelt
 * ausführt – nicht zwei parallele Anlege-Aufrufe startet und die Notiz verdoppelt.
 */
let pending: Promise<string> | null = null;

function ensureShowcaseNote(): Promise<string> {
  pending ??= (async () => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const existing = savedId ? await storage.getNote(savedId) : undefined;
    if (existing) return existing.id;
    const note = await storage.createNote({ title: SHOWCASE_TITLE, content: JSON.stringify(showcaseDoc) });
    localStorage.setItem(STORAGE_KEY, note.id);
    return note.id;
  })();
  return pending;
}

/**
 * `/showcase`: legt einmalig eine Beispiel-Notiz mit Formeln, Fußnoten, Taste und
 * Tief-/Hochgestellt an (falls noch nicht vorhanden) und leitet dorthin weiter –
 * zum direkten Ausprobieren im echten Editor inkl. Export.
 */
export function ShowcasePage() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureShowcaseNote().then((noteId) => {
      if (!cancelled) setId(noteId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!id) return null;
  return <Navigate to={`/n/${id}`} replace />;
}
