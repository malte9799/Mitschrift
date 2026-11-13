import { storage, type Note, type NotePatch, type Tag, type TagColor, type TagPatch } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { notifyTagsChanged } from '@/hooks/useTags';
import { welcomeNote } from './welcome';
import { DEBUG_TAG } from '@/debug/debugDocs';
import { canMoveUnder } from './noteLinks';
import { reloadTerms } from '@/glossary/store';
import { markDraft } from './draftNotes';

export async function createNote(init?: NotePatch) {
  const note = await storage.createNote(init);
  // Ohne Titel angelegt („Neue Notiz“, auch aus Vorlage): wieder weg, wenn man sie unberührt verlässt.
  if (!init?.title) markDraft(note.id);
  notifyNotesChanged();
  return note;
}

/** Rückfrage vor dem Löschen – überall gleich formuliert. */
export function trashMessage(title: string, hasChildren: boolean) {
  return (
    `„${title || 'Ohne Titel'}“ in den Papierkorb verschieben? Dort kannst du sie ${TRASH_DAYS} Tage lang wiederherstellen.` +
    (hasChildren ? ' Die Unterseiten bleiben erhalten und rücken eine Ebene nach oben.' : '')
  );
}

/** Verschiebt die Notiz in den Papierkorb. */
export async function deleteNote(id: string) {
  await storage.deleteNote(id);
  notifyNotesChanged();
}

export async function restoreNote(id: string) {
  const note = await storage.restoreNote(id);
  notifyNotesChanged();
  return note;
}

export async function purgeNote(id: string) {
  await storage.purgeNote(id);
}

/** Tage, nach denen Notizen im Papierkorb von selbst endgültig gelöscht werden. */
export const TRASH_DAYS = 30;

/** Beim Start: Notizen, die länger als {@link TRASH_DAYS} Tage im Papierkorb liegen, endgültig löschen. */
export async function purgeOldTrash() {
  const limit = Date.now() - TRASH_DAYS * 86_400_000;
  for (const n of await storage.listTrash()) if (n.trashedAt < limit) await storage.purgeNote(n.id);
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

/** Vereint zwei Tags: Alle Notizen/Glossarbegriffe/Termine des einen gehen aufs andere über. */
export async function mergeTag(sourceId: string, targetId: string) {
  await storage.mergeTag(sourceId, targetId);
  notifyTagsChanged();
  notifyNotesChanged();
  await reloadTerms();
}

/**
 * Führt Tags mit gleichem Namen (case-insensitive) einmalig zusammen – ältestes Tag bleibt.
 * Sonst würde die Gruppierung nach Namen Doppelteinträge zeigen.
 */
export async function dedupeTags() {
  const tags = await storage.listTags();
  const byName = new Map<string, Tag>();
  for (const t of tags) {
    const key = t.name.trim().toLowerCase();
    const kept = byName.get(key);
    if (kept) await storage.mergeTag(t.id, kept.id);
    else byName.set(key, t);
  }
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

/** Die Start-Tags aus dem Schule-Projekt, mit denselben Akzentfarben. */
const defaultTags: { name: string; color: TagColor }[] = [
  { name: 'Lernfeld 3', color: 'teal' },
  { name: 'Lernfeld 5', color: 'blue' },
  { name: 'Lernfeld 7', color: 'green' },
  { name: 'Lernfeld 9', color: 'graphite' },
  { name: 'Englisch', color: 'orange' },
  { name: 'Sozialkunde', color: 'purple' },
];

const TAGS_SEEDED_KEY = 'mitschrift-tags-seeded';

/** Legt einmalig die Start-Tags an, solange noch keine Tags existieren. */
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
