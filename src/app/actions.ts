import { storage, type Note, type NotePatch, type TagColor, type TagPatch } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { notifyTagsChanged } from '@/hooks/useTags';
import { welcomeNote } from './welcome';
import { DEBUG_TAG } from '@/debug/debugDocs';
import { canMoveUnder } from './noteLinks';
import { reloadTerms } from '@/glossary/store';

export async function createNote(init?: NotePatch) {
  const note = await storage.createNote(init);
  notifyNotesChanged();
  return note;
}

export async function deleteNote(id: string) {
  await storage.deleteNote(id);
  notifyNotesChanged();
}

/** Hängt `id` unter `parentId` (`null` = oberste Ebene). Verhindert Zyklen. */
export async function moveNote(id: string, parentId: string | null, notes: Note[]) {
  if (!canMoveUnder(id, parentId, notes)) return false;
  await storage.updateNote(id, { parentId });
  notifyNotesChanged();
  return true;
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
  // Debug-Notizen (nur Dev-Server) zählen nicht – sonst fehlte dort die Willkommens-Notiz.
  const debugTag = (await storage.listTags()).find((t) => t.name === DEBUG_TAG);
  const existing = (await storage.listNotes()).filter((n) => !debugTag || !n.tags.includes(debugTag.id));
  if (existing.length > 0) return;
  await storage.createNote(welcomeNote());
  notifyNotesChanged();
}

export async function createTag(name: string, color: TagColor) {
  const tag = await storage.createTag(name.trim(), color);
  notifyTagsChanged();
  return tag;
}

export async function updateTag(id: string, patch: TagPatch) {
  await storage.updateTag(id, patch);
  notifyTagsChanged();
}

export async function deleteTag(id: string) {
  await storage.deleteTag(id);
  notifyTagsChanged();
  notifyNotesChanged();
  await reloadTerms();
}

/** Farbwahl für Tags, in der Reihenfolge der Auswahl-Palette. */
export const tagColors: { value: TagColor; label: string }[] = [
  { value: 'teal', label: 'Petrol' },
  { value: 'blue', label: 'Blau' },
  { value: 'green', label: 'Grün' },
  { value: 'amber', label: 'Gelb' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Rot' },
  { value: 'pink', label: 'Pink' },
  { value: 'purple', label: 'Lila' },
  { value: 'graphite', label: 'Grafit' },
];

/** Die Fächer aus dem Schule-Projekt, mit denselben Akzentfarben. */
const defaultTags: { name: string; color: TagColor }[] = [
  { name: 'Lernfeld 3', color: 'teal' },
  { name: 'Lernfeld 5', color: 'blue' },
  { name: 'Lernfeld 7', color: 'green' },
  { name: 'Lernfeld 9', color: 'graphite' },
  { name: 'Englisch', color: 'orange' },
  { name: 'Sozialkunde', color: 'purple' },
];

const TAGS_SEEDED_KEY = 'mitschrift-tags-seeded';

/** Legt einmalig die Schulfächer als Tags an, solange noch keine Tags existieren. */
export async function seedDefaultTags() {
  try {
    if (localStorage.getItem(TAGS_SEEDED_KEY)) return;
    localStorage.setItem(TAGS_SEEDED_KEY, '1');
  } catch {
    return;
  }
  if ((await storage.listTags()).length > 0) return;
  for (const t of defaultTags) await storage.createTag(t.name, t.color);
  notifyTagsChanged();
}
