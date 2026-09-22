import { storage } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { welcomeNote } from './welcome';

export async function createNote() {
  const note = await storage.createNote();
  notifyNotesChanged();
  return note;
}

export async function deleteNote(id: string) {
  await storage.deleteNote(id);
  notifyNotesChanged();
}

export async function toggleStar(id: string, starred: boolean) {
  await storage.updateNote(id, { starred });
  notifyNotesChanged();
}

const SEEDED_KEY = 'mitschrift-seeded';

/** Legt beim allerersten Start eine Willkommens-Notiz an, die alle Blöcke zeigt. */
export async function seedIfFirstRun() {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    return;
  }
  const existing = await storage.listNotes();
  if (existing.length > 0) return;
  await storage.createNote(welcomeNote());
  notifyNotesChanged();
}
