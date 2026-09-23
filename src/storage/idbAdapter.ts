import { openDB, type DBSchema } from 'idb';
import type { Note, NotePatch, Snippet, StorageAdapter, Tag } from './types';

interface MitschriftDB extends DBSchema {
  notes: { key: string; value: Note; indexes: { updatedAt: number } };
  snippets: { key: string; value: Snippet };
  files: { key: string; value: { id: string; blob: Blob } };
  tags: { key: string; value: Tag };
}

const dbPromise = openDB<MitschriftDB>('mitschrift', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const notes = db.createObjectStore('notes', { keyPath: 'id' });
      notes.createIndex('updatedAt', 'updatedAt');
      db.createObjectStore('snippets', { keyPath: 'id' });
      db.createObjectStore('files', { keyPath: 'id' });
    }
    if (oldVersion < 2) db.createObjectStore('tags', { keyPath: 'id' });
  },
});

let lastTagCreated = 0;

/** Local-first-Speicher im Browser. */
export const idbAdapter: StorageAdapter = {
  async listNotes() {
    const all = await (await dbPromise).getAllFromIndex('notes', 'updatedAt');
    return all.reverse();
  },

  async getNote(id) {
    return (await dbPromise).get('notes', id);
  },

  async createNote(init = {}) {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      folder: null,
      tags: [],
      starred: false,
      createdAt: now,
      updatedAt: now,
      ...init,
    };
    await (await dbPromise).put('notes', note);
    return note;
  },

  async updateNote(id, patch: NotePatch) {
    const db = await dbPromise;
    const tx = db.transaction('notes', 'readwrite');
    const prev = await tx.store.get(id);
    if (!prev) return undefined;
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async deleteNote(id) {
    await (await dbPromise).delete('notes', id);
  },

  async listTags() {
    const all = await (await dbPromise).getAll('tags');
    return all.sort((a, b) => a.createdAt - b.createdAt);
  },

  async createTag(name, color) {
    // Streng steigend, damit mehrere Tags in derselben Millisekunde ihre Reihenfolge behalten.
    lastTagCreated = Math.max(Date.now(), lastTagCreated + 1);
    const tag: Tag = { id: crypto.randomUUID(), name, color, createdAt: lastTagCreated };
    await (await dbPromise).put('tags', tag);
    return tag;
  },

  async updateTag(id, patch) {
    const db = await dbPromise;
    const prev = await db.get('tags', id);
    if (!prev) return undefined;
    const next = { ...prev, ...patch };
    await db.put('tags', next);
    return next;
  },

  async deleteTag(id) {
    const db = await dbPromise;
    const tx = db.transaction(['tags', 'notes'], 'readwrite');
    await tx.objectStore('tags').delete(id);
    const notes = tx.objectStore('notes');
    // Ohne updatedAt zu ändern – das Entfernen eines Tags soll die Sortierung nicht verschieben.
    for (const note of await notes.getAll()) {
      if (note.tags.includes(id)) await notes.put({ ...note, tags: note.tags.filter((t) => t !== id) });
    }
    await tx.done;
  },

  async listSnippets() {
    const all = await (await dbPromise).getAll('snippets');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async createSnippet(name, content) {
    const snippet: Snippet = { id: crypto.randomUUID(), name, content, createdAt: Date.now() };
    await (await dbPromise).put('snippets', snippet);
    return snippet;
  },

  async deleteSnippet(id) {
    await (await dbPromise).delete('snippets', id);
  },

  async putFile(blob) {
    const id = crypto.randomUUID();
    await (await dbPromise).put('files', { id, blob });
    return id;
  },

  async getFile(id) {
    return (await (await dbPromise).get('files', id))?.blob;
  },
};
