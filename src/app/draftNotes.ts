import { storage } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';

/**
 * Neu angelegte Notizen, an denen noch nichts geändert wurde. Verlässt man so eine Notiz,
 * ohne etwas zu tun, wird sie wieder gelöscht – „Neue Notiz“ hinterlässt keinen leeren Müll.
 * Die IDs liegen auch in localStorage: Wird die App über einer unberührten Notiz geschlossen,
 * räumt der nächste Start sie weg.
 */
const KEY = 'mitschrift-draft-notes';

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

const drafts = load();

function persist() {
  try {
    if (drafts.size) localStorage.setItem(KEY, JSON.stringify([...drafts]));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
}

export function markDraft(id: string) {
  drafts.add(id);
  persist();
}

/** Erste echte Änderung (Titel, Text, Tags, Favorit …): Notiz bleibt. */
export function touchDraft(id: string) {
  if (drafts.delete(id)) persist();
}

const isOpen = (id: string) => window.location.pathname.endsWith(`/n/${id}`);

async function discard(ids: string[]) {
  const notes = await storage.listNotes();
  let removed = false;
  for (const id of ids) {
    if (!drafts.has(id) || isOpen(id)) continue;
    drafts.delete(id);
    // Hat sie inzwischen Unterseiten, wurde offensichtlich doch etwas damit gemacht.
    if (notes.some((n) => n.parentId === id)) continue;
    if (!notes.some((n) => n.id === id)) continue;
    await storage.deleteNote(id);
    removed = true;
  }
  persist();
  if (removed) notifyNotesChanged();
}

/** Beim Verlassen einer Notiz: war sie ein unberührter Entwurf, weg damit. */
export function leaveNote(id: string) {
  if (!drafts.has(id)) return;
  // Erst nach dem Wechsel prüfen: Wird dieselbe Notiz nur neu aufgebaut, ist sie danach wieder offen.
  setTimeout(() => void discard([id]), 0);
}

/** Beim Start: Entwürfe aus der letzten Sitzung entfernen (außer der gerade geöffneten). */
export function cleanupDrafts() {
  if (drafts.size) void discard([...drafts]);
}
