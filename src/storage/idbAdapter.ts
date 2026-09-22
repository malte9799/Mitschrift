import { openDB, type DBSchema } from 'idb';
import type { Note, NotePatch, Snippet, StorageAdapter } from './types';

interface MitschriftDB extends DBSchema {
  notes: { key: string; value: Note; indexes: { updatedAt: number } };
  snippets: { key: string; value: Snippet };
  files: { key: string; value: { id: string; blob: Blob } };
}

const dbPromise = openDB<MitschriftDB>('mitschrift', 1, {
  upgrade(db) {
    const notes = db.createObjectStore('notes', { keyPath: 'id' });
    notes.createIndex('updatedAt', 'updatedAt');
    db.createObjectStore('snippets', { keyPath: 'id' });
    db.createObjectStore('files', { keyPath: 'id' });
  },
});

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
