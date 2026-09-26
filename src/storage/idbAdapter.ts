import { openDB, type DBSchema } from 'idb';
import type { CalendarEvent, Note, NotePatch, Snippet, StorageAdapter, StorageDump, Tag, Term } from './types';

interface MitschriftDB extends DBSchema {
  notes: { key: string; value: Note; indexes: { updatedAt: number } };
  snippets: { key: string; value: Snippet };
  files: { key: string; value: { id: string; blob: Blob } };
  tags: { key: string; value: Tag };
  terms: { key: string; value: Term };
  events: { key: string; value: CalendarEvent; indexes: { date: string } };
}

const dbPromise = openDB<MitschriftDB>('mitschrift', 4, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const notes = db.createObjectStore('notes', { keyPath: 'id' });
      notes.createIndex('updatedAt', 'updatedAt');
      db.createObjectStore('snippets', { keyPath: 'id' });
      db.createObjectStore('files', { keyPath: 'id' });
    }
    if (oldVersion < 2) db.createObjectStore('tags', { keyPath: 'id' });
    if (oldVersion < 3) db.createObjectStore('terms', { keyPath: 'id' });
    if (oldVersion < 4) {
      const events = db.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('date', 'date');
    }
  },
  // Ein anderer Tab hält noch diese (alte) Verbindung offen und würde damit das Upgrade dort
  // für immer blockieren – hier einfach schließen, der andere Tab lädt sich bei Bedarf neu.
  blocking(_current, _blocked, event) {
    (event.target as IDBDatabase).close();
  },
  // Diese Verbindung wollte upgraden, wurde aber von einem älteren, noch offenen Tab blockiert.
  // Ohne diesen Handler bliebe die dbPromise für immer hängen – und mit ihr jedes storage.*
  // (Notizen laden nie, „Neue Notiz“ tut nichts). Der andere Tab schließt sich via `blocking`
  // oben von selbst; hier reicht ein Reload, sobald das passiert ist.
  blocked() {
    location.reload();
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
      parentId: null,
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
    // Reines Verschieben im Baum zählt nicht als Bearbeitung – die Liste soll nicht umsortieren.
    const onlyMove = Object.keys(patch).every((k) => k === 'parentId');
    const next = { ...prev, ...patch, updatedAt: onlyMove ? prev.updatedAt : Date.now() };
    await tx.store.put(next);
    await tx.done;
    return next;
  },

  async deleteNote(id) {
    const db = await dbPromise;
    const tx = db.transaction('notes', 'readwrite');
    const note = await tx.store.get(id);
    await tx.store.delete(id);
    // Unterseiten nicht mitlöschen, sondern an die Eltern-Notiz hängen (ohne updatedAt zu ändern).
    for (const child of await tx.store.getAll()) {
      if (child.parentId === id) await tx.store.put({ ...child, parentId: note?.parentId ?? null });
    }
    await tx.done;
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
    const tx = db.transaction(['tags', 'notes', 'terms'], 'readwrite');
    await tx.objectStore('tags').delete(id);
    const terms = tx.objectStore('terms');
    for (const t of await terms.getAll()) {
      if (t.tags.includes(id)) await terms.put({ ...t, tags: t.tags.filter((x) => x !== id) });
    }
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

  async listTerms() {
    const all = await (await dbPromise).getAll('terms');
    return all.sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));
  },

  async createTerm(init) {
    const now = Date.now();
    const term: Term = { id: crypto.randomUUID(), expansion: '', definition: '', tags: [], createdAt: now, updatedAt: now, ...init };
    await (await dbPromise).put('terms', term);
    return term;
  },

  async updateTerm(id, patch) {
    const db = await dbPromise;
    const prev = await db.get('terms', id);
    if (!prev) return undefined;
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    await db.put('terms', next);
    return next;
  },

  async deleteTerm(id) {
    await (await dbPromise).delete('terms', id);
  },

  async listEvents() {
    const all = await (await dbPromise).getAllFromIndex('events', 'date');
    return all;
  },

  async createEvent(init) {
    const now = Date.now();
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: '',
      time: '',
      endTime: '',
      notes: '',
      noteId: null,
      tags: [],
      source: 'manual',
      completed: false,
      createdAt: now,
      updatedAt: now,
      ...init,
    };
    await (await dbPromise).put('events', event);
    return event;
  },

  async updateEvent(id, patch) {
    const db = await dbPromise;
    const prev = await db.get('events', id);
    if (!prev) return undefined;
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    await db.put('events', next);
    return next;
  },

  async deleteEvent(id) {
    await (await dbPromise).delete('events', id);
  },

  async replaceSyncedEvents(source, events) {
    const db = await dbPromise;
    const tx = db.transaction('events', 'readwrite');
    const store = tx.store;
    // Alte Termine dieser Quelle raus, damit gestrichene/verschobene Stunden nicht liegen bleiben.
    for (const e of await store.getAll()) {
      if (e.source === source) await store.delete(e.id);
    }
    for (const e of events) await store.put(e);
    await tx.done;
  },

  async putFile(blob) {
    const id = crypto.randomUUID();
    await (await dbPromise).put('files', { id, blob });
    return id;
  },

  async getFile(id) {
    return (await (await dbPromise).get('files', id))?.blob;
  },
  async dumpAll() {
    const db = await dbPromise;
    const tx = db.transaction(['notes', 'tags', 'snippets', 'files']);
    const [notes, tags, snippets, files] = await Promise.all([
      tx.objectStore('notes').getAll(),
      tx.objectStore('tags').getAll(),
      tx.objectStore('snippets').getAll(),
      tx.objectStore('files').getAll(),
    ]);
    await tx.done;
    return { notes, tags, snippets, files };
  },

  async mergeAll(dump: StorageDump) {
    const db = await dbPromise;
    const tx = db.transaction(['notes', 'tags', 'snippets', 'files'], 'readwrite');
    const result = { added: 0, updated: 0, skipped: 0 };
    const notes = tx.objectStore('notes');
    for (const note of dump.notes) {
      const prev = await notes.get(note.id);
      if (!prev) result.added++;
      else if (note.updatedAt > prev.updatedAt) result.updated++;
      else {
        result.skipped++;
        continue;
      }
      await notes.put(note);
    }
    // Tags, Snippets und Dateien ändern sich unter derselben ID nicht inhaltlich – nur Fehlendes ergänzen.
    const addMissing = async <S extends 'tags' | 'snippets' | 'files'>(name: S, items: MitschriftDB[S]['value'][]) => {
      const store = tx.objectStore(name);
      for (const item of items) if (!(await store.getKey(item.id))) await store.put(item);
    };
    await addMissing('tags', dump.tags);
    await addMissing('snippets', dump.snippets);
    await addMissing('files', dump.files);
    await tx.done;
    return result;
  },
};
