import type { CalendarEvent, Note, NotePatch, Snippet, StorageAdapter, StorageDump, StoredFile, Tag, Term } from '../types';
import { emitExternalChange, emitStorageError, type ExternalChange } from '../changes';
import { buildMirror } from './mirror';

/**
 * Speicher in einem vom Nutzer gewählten Ordner (File System Access API), ähnlich wie ein Obsidian-Vault:
 *
 *   Ordner/
 *   ├─ Titel.mitschrift.json   ← eine Notiz, verlustfrei (Quelle der Wahrheit)
 *   ├─ Titel.md                ← lesbarer Markdown-Spiegel mit Frontmatter (wird nie zurückgelesen)
 *   ├─ Anhänge/                ← Bilder und Dateien unter ihrem Originalnamen
 *   └─ .mitschrift/            ← Tags, Glossar, Termine, Snippets, Anhang-Index
 *
 * Alles wird beim Öffnen einmal eingelesen und im Speicher gehalten; Änderungen gehen sofort in die Dateien.
 * Änderungen von außen erkennt ein `FileSystemObserver` (wo vorhanden) bzw. Polling.
 */

export const NOTE_EXT = '.mitschrift.json';
const MIRROR_EXT = '.md';
const META_DIR = '.mitschrift';
const FILES_DIR = 'Anhänge';

const META = {
  tags: 'tags.json',
  snippets: 'snippets.json',
  terms: 'glossar.json',
  events: 'termine.json',
  files: 'anhaenge.json',
} as const;
type MetaKey = keyof typeof META;

/** Inhalt einer `.mitschrift.json`. `content` ist das Tiptap-JSON als Objekt (lesbarer als ein String im String). */
interface NoteFile extends Omit<Note, 'content'> {
  format: 'mitschrift-note';
  version: 1;
  content: unknown;
}

interface FileEntry {
  id: string;
  /** Pfad relativ zum Ordner, z. B. `Anhänge/foto.png`. */
  path: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface FolderAdapter extends StorageAdapter {
  readonly folderName: string;
  /** Beginnt, den Ordner auf Änderungen von außen zu beobachten. */
  watch(): () => void;
}

const isNotFound = (err: unknown) => err instanceof DOMException && err.name === 'NotFoundError';

/** Dateiname aus dem Titel – ohne Zeichen, die macOS/Windows/Sync-Dienste stören. */
function stemFor(title: string) {
  const s = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .slice(0, 100)
    .trim();
  return s || 'Ohne Titel';
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toNoteFile(note: Note): NoteFile {
  let content: unknown = note.content;
  if (note.content) {
    try {
      content = JSON.parse(note.content);
    } catch {
      // Kein JSON – als String ablegen.
    }
  }
  const { content: _c, ...rest } = note;
  return { format: 'mitschrift-note', version: 1, ...rest, content };
}

function fromNoteFile(data: unknown): Note | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<NoteFile>;
  if (typeof d.id !== 'string' || !d.id) return null;
  const now = Date.now();
  return {
    id: d.id,
    title: typeof d.title === 'string' ? d.title : '',
    content: d.content == null || d.content === '' ? '' : typeof d.content === 'string' ? d.content : JSON.stringify(d.content),
    folder: d.folder ?? null,
    parentId: d.parentId ?? null,
    tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string') : [],
    starred: !!d.starred,
    ...(d.template ? { template: true } : {}),
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : now,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : now,
  };
}

const extFromMime: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

export async function openFolderAdapter(dir: FileSystemDirectoryHandle): Promise<FolderAdapter> {
  // ---------- Zustand im Speicher ----------
  const notes = new Map<string, Note>();
  /** Notiz-ID → Dateiname ohne Endung („Titel“, „Titel 2“). */
  const stems = new Map<string, string>();
  let tags: Tag[] = [];
  let snippets: Snippet[] = [];
  let terms: Term[] = [];
  let events: CalendarEvent[] = [];
  let files: FileEntry[] = [];
  /** Alle Dateinamen im Wurzelordner (klein geschrieben – macOS unterscheidet nicht). */
  const rootNames = new Set<string>();
  /** Dateinamen, die beim letzten Einlesen tatsächlich im Wurzelordner lagen. */
  let scannedNames = new Set<string>();
  /** Pfad → lastModified, wie zuletzt gelesen/geschrieben; erkennt Änderungen von außen. */
  const stamps = new Map<string, number>();
  /** Pfad → zuletzt gelesener/geschriebener Text; trennt echte Änderungen von bloßem Neu-Speichern. */
  const texts = new Map<string, string>();

  // ---------- Dateizugriff ----------
  async function dirFor(path: string, create: boolean): Promise<[FileSystemDirectoryHandle, string]> {
    const parts = path.split('/');
    const name = parts.pop()!;
    let d = dir;
    for (const p of parts) d = await d.getDirectoryHandle(p, { create });
    return [d, name];
  }

  async function readFile(path: string): Promise<File | undefined> {
    try {
      const [d, name] = await dirFor(path, false);
      return await (await d.getFileHandle(name)).getFile();
    } catch (err) {
      if (isNotFound(err) || err instanceof TypeError) return undefined;
      throw err;
    }
  }

  let pendingWrites = 0;
  /** Schreibvorgänge pro Pfad nacheinander – zwei `createWritable` auf dieselbe Datei vertragen sich nicht. */
  const queues = new Map<string, Promise<void>>();
  /**
   * Fehler werden gemeldet *und* an den Aufrufer weitergegeben – sonst hielte er einen
   * gescheiterten Schreibvorgang für gelungen (z. B. alte Datei nach dem Umbenennen löschen).
   * Die Warteschlange selbst läuft nach einem Fehler weiter.
   */
  function enqueue(path: string, job: () => Promise<void>): Promise<void> {
    pendingWrites++;
    const done = (queues.get(path) ?? Promise.resolve())
      .then(job)
      .catch((err: unknown) => {
        console.error(`Mitschrift: ${path} konnte nicht geschrieben werden`, err);
        emitStorageError(err);
        throw err;
      })
      .finally(() => {
        pendingWrites--;
        if (queues.get(path) === settled) queues.delete(path);
      });
    const settled = done.catch(() => undefined);
    queues.set(path, settled);
    return done;
  }

  function write(path: string, data: string | Blob) {
    if (typeof data === 'string') texts.set(path, data);
    return enqueue(path, async () => {
      const [d, name] = await dirFor(path, true);
      const handle = await d.getFileHandle(name, { create: true });
      const w = await handle.createWritable();
      await w.write(data);
      await w.close();
      stamps.set(path, (await handle.getFile()).lastModified);
      if (!path.includes('/')) rootNames.add(path.toLowerCase());
    });
  }

  function remove(path: string) {
    texts.delete(path);
    stamps.delete(path);
    if (!path.includes('/')) rootNames.delete(path.toLowerCase());
    return enqueue(path, async () => {
      try {
        const [d, name] = await dirFor(path, false);
        await d.removeEntry(name);
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
    });
  }

  const json = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`;

  // ---------- Notizen ----------
  /** Freier Dateiname für eine Notiz – kollidiert weder mit anderen Notizen noch mit fremden Dateien im Ordner. */
  function allocStem(id: string, title: string) {
    const base = stemFor(title);
    const own = stems.get(id);
    const free = (stem: string) => {
      if (stem === own) return true;
      const lower = stem.toLowerCase();
      return !rootNames.has(lower + NOTE_EXT) && !rootNames.has(lower + MIRROR_EXT);
    };
    if (free(base)) return base;
    for (let i = 2; ; i++) if (free(`${base} ${i}`)) return `${base} ${i}`;
  }

  /** Frühere Dateinamen umbenannter Notizen, die erst nach erfolgreichem Schreiben weg dürfen. */
  const staleStems = new Map<string, Set<string>>();

  /** Passt der bisherige Dateiname noch zum Titel („Titel“ oder „Titel 3“)? */
  const stemMatches = (stem: string, title: string) => new RegExp(`^${escapeRegExp(stemFor(title))}( \\d+)?$`, 'i').test(stem);

  function persistNote(note: Note) {
    const prev = stems.get(note.id);
    let stem = prev;
    if (!stem || !stemMatches(stem, note.title)) {
      stem = allocStem(note.id, note.title);
      stems.set(note.id, stem);
      // Reservieren, bevor die Datei geschrieben ist – sonst bekämen zwei schnelle Notizen denselben Namen.
      rootNames.add((stem + NOTE_EXT).toLowerCase());
      rootNames.add((stem + MIRROR_EXT).toLowerCase());
    }
    if (prev && prev !== stem) {
      // Umbenannt: alte Dateien merken und erst entfernen, wenn die neue sicher liegt.
      const old = staleStems.get(note.id) ?? new Set<string>();
      old.add(prev);
      old.delete(stem);
      staleStems.set(note.id, old);
    }
    const target = stem;
    const done = write(stem + NOTE_EXT, json(toNoteFile(note)));
    void done
      .then(() => {
        const old = staleStems.get(note.id);
        if (!old?.size || stems.get(note.id) !== target) return;
        staleStems.delete(note.id);
        return Promise.all([...old].flatMap((s) => [remove(s + NOTE_EXT), remove(s + MIRROR_EXT)]));
      })
      // Schreiben fehlgeschlagen: alte Datei bleibt liegen – der nächste erfolgreiche Durchlauf räumt auf.
      .catch(() => undefined);
    scheduleMirror(note.id);
    return done;
  }

  function dropNote(id: string) {
    const stem = stems.get(id);
    const old = [...(staleStems.get(id) ?? [])];
    notes.delete(id);
    stems.delete(id);
    staleStems.delete(id);
    mirrorTimers.delete(id);
    const all = stem ? [stem, ...old] : old;
    if (all.length) return Promise.all(all.flatMap((s) => [remove(s + NOTE_EXT), remove(s + MIRROR_EXT)])).then(() => undefined);
  }

  // ---------- Markdown-Spiegel ----------
  const mirrorTimers = new Map<string, ReturnType<typeof setTimeout>>();
  function scheduleMirror(id: string, delay = 1500) {
    clearTimeout(mirrorTimers.get(id));
    mirrorTimers.set(
      id,
      setTimeout(() => {
        mirrorTimers.delete(id);
        const note = notes.get(id);
        const stem = stems.get(id);
        if (!note || !stem) return;
        buildMirror(note, { tags, files, sourceName: stem + NOTE_EXT })
          .then((md) => (stems.get(id) === stem && texts.get(stem + MIRROR_EXT) !== md ? write(stem + MIRROR_EXT, md) : undefined))
          .catch((err) => console.warn('Mitschrift: Markdown-Spiegel fehlgeschlagen', err));
      }, delay),
    );
  }
  /** Tags heißen im Spiegel mit Namen – nach einer Umbenennung alle neu schreiben. */
  function remirrorAll() {
    let i = 0;
    for (const id of notes.keys()) scheduleMirror(id, 1500 + i++ * 20);
  }

  // ---------- Metadaten (.mitschrift/*.json) ----------
  const metaPath = (key: MetaKey) => `${META_DIR}/${META[key]}`;
  function saveMeta(key: MetaKey) {
    const data = { tags, snippets, terms, events, files }[key];
    return write(metaPath(key), json(data));
  }

  async function loadMeta(key: MetaKey, force: boolean): Promise<boolean> {
    const path = metaPath(key);
    const f = await readFile(path);
    if (!f) return false;
    if (!force && stamps.get(path) === f.lastModified) return false;
    const text = await f.text();
    stamps.set(path, f.lastModified);
    if (!force && texts.get(path) === text) return false;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`Mitschrift: ${path} ist kein gültiges JSON – übersprungen.`);
      return false;
    }
    if (!Array.isArray(data)) return false;
    texts.set(path, text);
    if (key === 'tags') tags = data as Tag[];
    else if (key === 'snippets') snippets = data as Snippet[];
    else if (key === 'terms') terms = data as Term[];
    else if (key === 'events') events = data as CalendarEvent[];
    else files = data as FileEntry[];
    return true;
  }

  // ---------- Einlesen / Abgleich ----------
  let scanning = false;

  /** Liest den Ordner ein; beim ersten Mal alles, danach nur, was sich seit dem letzten Stand geändert hat. */
  async function scan(initial: boolean): Promise<ExternalChange | null> {
    const change: ExternalChange = { notes: [], tags: false, snippets: false, terms: false, events: false };
    const seen = new Map<string, string>(); // id → stem
    const names = new Set<string>();

    for await (const entry of dir.values()) {
      if (entry.kind !== 'file') continue;
      names.add(entry.name.toLowerCase());
      if (!entry.name.endsWith(NOTE_EXT)) continue;
      const stem = entry.name.slice(0, -NOTE_EXT.length);
      const path = entry.name;
      let file: File;
      try {
        file = await (entry as FileSystemFileHandle).getFile();
      } catch {
        continue;
      }
      const knownId = [...stems].find(([, s]) => s === stem)?.[0];
      if (!initial && knownId && stamps.get(path) === file.lastModified) {
        seen.set(knownId, stem);
        continue;
      }
      const text = await file.text();
      stamps.set(path, file.lastModified);
      if (!initial && knownId && texts.get(path) === text) {
        seen.set(knownId, stem);
        continue;
      }
      let note: Note | null = null;
      try {
        note = fromNoteFile(JSON.parse(text));
      } catch {
        // Gerade halb geschrieben oder von Hand kaputt editiert – beim nächsten Durchlauf nochmal.
        stamps.delete(path);
        if (knownId) seen.set(knownId, stem);
        continue;
      }
      if (!note) continue;
      const other = seen.get(note.id);
      // Dieselbe ID zweimal (kopierte Datei): die Datei behalten, unter der die Notiz bisher lag.
      if (other && stems.get(note.id) !== stem) continue;
      texts.set(path, text);
      seen.set(note.id, stem);
      const prev = notes.get(note.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(note) || stems.get(note.id) !== stem) {
        notes.set(note.id, note);
        stems.set(note.id, stem);
        change.notes.push(note.id);
        if (!initial) scheduleMirror(note.id);
      }
    }

    // Von außen gelöscht: aus dem Bestand nehmen (der Spiegel gehört uns und darf mit).
    for (const id of [...notes.keys()]) {
      if (seen.has(id)) continue;
      const stem = stems.get(id);
      notes.delete(id);
      stems.delete(id);
      change.notes.push(id);
      if (stem && names.has((stem + MIRROR_EXT).toLowerCase())) void remove(stem + MIRROR_EXT).catch(() => undefined);
    }

    scannedNames = names;
    rootNames.clear();
    for (const n of names) rootNames.add(n);
    for (const s of stems.values()) {
      rootNames.add((s + NOTE_EXT).toLowerCase());
      rootNames.add((s + MIRROR_EXT).toLowerCase());
    }

    for (const key of Object.keys(META) as MetaKey[]) {
      if ((await loadMeta(key, initial)) && key !== 'files') change[key] = true;
    }

    const any = change.notes.length || change.tags || change.snippets || change.terms || change.events;
    return any ? change : null;
  }

  async function rescan() {
    // Während eigener Schreibvorgänge (z. B. Umbenennen) sähe der Ordner kurz inkonsistent aus.
    if (scanning || pendingWrites > 0) return;
    scanning = true;
    try {
      const change = await scan(false);
      if (change) emitExternalChange(change);
    } catch (err) {
      console.warn('Mitschrift: Ordner konnte nicht abgeglichen werden', err);
    } finally {
      scanning = false;
    }
  }

  await scan(true);

  // ---------- Hilfen für Mehrfach-Änderungen ----------
  /** Ändert Tag-Listen überall (Notizen, Glossar, Termine), ohne `updatedAt` anzufassen. */
  async function rewriteTagRefs(fn: (list: string[]) => string[]) {
    const jobs: Promise<unknown>[] = [];
    for (const note of notes.values()) {
      const next = fn(note.tags);
      if (next !== note.tags) {
        const updated = { ...note, tags: next };
        notes.set(note.id, updated);
        jobs.push(persistNote(updated));
      }
    }
    let termsChanged = false;
    terms = terms.map((t) => {
      const next = fn(t.tags);
      if (next === t.tags) return t;
      termsChanged = true;
      return { ...t, tags: next };
    });
    let eventsChanged = false;
    events = events.map((e) => {
      const next = fn(e.tags);
      if (next === e.tags) return e;
      eventsChanged = true;
      return { ...e, tags: next };
    });
    if (termsChanged) jobs.push(saveMeta('terms'));
    if (eventsChanged) jobs.push(saveMeta('events'));
    await Promise.all(jobs);
  }

  async function readStoredFile(entry: FileEntry): Promise<Blob | undefined> {
    const f = await readFile(entry.path);
    if (!f) return undefined;
    return entry.mimeType && f.type !== entry.mimeType ? new Blob([f], { type: entry.mimeType }) : f;
  }

  async function allocFilePath(name: string) {
    const taken = new Set(files.map((f) => f.path.toLowerCase()));
    try {
      const d = await dir.getDirectoryHandle(FILES_DIR);
      for await (const e of d.values()) taken.add(`${FILES_DIR}/${e.name}`.toLowerCase());
    } catch {
      // Ordner gibt es noch nicht.
    }
    const clean = stemFor(name);
    const dot = clean.lastIndexOf('.');
    const [base, ext] = dot > 0 ? [clean.slice(0, dot), clean.slice(dot)] : [clean, ''];
    for (let i = 1; ; i++) {
      const path = `${FILES_DIR}/${i === 1 ? base : `${base} ${i}`}${ext}`;
      if (!taken.has(path.toLowerCase())) return path;
    }
  }

  let lastTagCreated = 0;

  const adapter: FolderAdapter = {
    folderName: dir.name,

    watch() {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let observer: { disconnect(): void } | undefined;
      const soon = () => {
        clearTimeout(burst);
        burst = setTimeout(() => void rescan(), 300);
      };
      let burst: ReturnType<typeof setTimeout> | undefined;

      // Chrome ab 129: Benachrichtigung bei Änderungen. Polling bleibt als (seltener) Fallback.
      const Observer = (globalThis as { FileSystemObserver?: new (cb: () => void) => { observe(h: FileSystemHandle, o?: { recursive?: boolean }): Promise<void>; disconnect(): void } })
        .FileSystemObserver;
      if (Observer) {
        try {
          const o = new Observer(soon);
          o.observe(dir, { recursive: true }).catch(() => undefined);
          observer = o;
        } catch {
          observer = undefined;
        }
      }
      const interval = observer ? 30_000 : 3_000;
      const tick = () => {
        if (stopped) return;
        if (document.visibilityState === 'visible') void rescan();
        timer = setTimeout(tick, interval);
      };
      timer = setTimeout(tick, interval);
      const onVisible = () => document.visibilityState === 'visible' && soon();
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', soon);
      return () => {
        stopped = true;
        clearTimeout(timer);
        clearTimeout(burst);
        observer?.disconnect();
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', soon);
      };
    },

    async listNotes() {
      return [...notes.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async getNote(id) {
      return notes.get(id);
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
      notes.set(note.id, note);
      await persistNote(note);
      return note;
    },

    async updateNote(id, patch: NotePatch) {
      const prev = notes.get(id);
      if (!prev) return undefined;
      // Reines Verschieben im Baum zählt nicht als Bearbeitung – die Liste soll nicht umsortieren.
      const onlyMove = Object.keys(patch).every((k) => k === 'parentId');
      const next = { ...prev, ...patch, updatedAt: onlyMove ? prev.updatedAt : Date.now() };
      notes.set(id, next);
      await persistNote(next);
      return next;
    },

    async deleteNote(id) {
      const note = notes.get(id);
      const jobs: Promise<unknown>[] = [];
      if (note) jobs.push(dropNote(id) ?? Promise.resolve());
      // Unterseiten nicht mitlöschen, sondern an die Eltern-Notiz hängen (ohne updatedAt zu ändern).
      for (const child of notes.values()) {
        if (child.parentId === id) {
          const moved = { ...child, parentId: note?.parentId ?? null };
          notes.set(child.id, moved);
          jobs.push(persistNote(moved));
        }
      }
      await Promise.all(jobs);
    },

    async listTags() {
      return [...tags].sort((a, b) => a.createdAt - b.createdAt);
    },

    async createTag(name, color) {
      lastTagCreated = Math.max(Date.now(), lastTagCreated + 1);
      const tag: Tag = { id: crypto.randomUUID(), name, color, createdAt: lastTagCreated };
      tags = [...tags, tag];
      await saveMeta('tags');
      return tag;
    },

    async updateTag(id, patch) {
      const prev = tags.find((t) => t.id === id);
      if (!prev) return undefined;
      const next = { ...prev, ...patch };
      tags = tags.map((t) => (t.id === id ? next : t));
      await saveMeta('tags');
      if (patch.name !== undefined && patch.name !== prev.name) remirrorAll();
      return next;
    },

    async deleteTag(id) {
      tags = tags.filter((t) => t.id !== id);
      await Promise.all([saveMeta('tags'), rewriteTagRefs((list) => (list.includes(id) ? list.filter((t) => t !== id) : list))]);
    },

    async mergeTag(sourceId, targetId) {
      if (sourceId === targetId || !tags.some((t) => t.id === targetId)) return;
      await rewriteTagRefs((list) =>
        list.includes(sourceId) ? list.map((t) => (t === sourceId ? targetId : t)).filter((t, i, a) => a.indexOf(t) === i) : list,
      );
      tags = tags.filter((t) => t.id !== sourceId);
      await saveMeta('tags');
      remirrorAll();
    },

    async listSnippets() {
      return [...snippets].sort((a, b) => b.createdAt - a.createdAt);
    },

    async createSnippet(name, content) {
      const snippet: Snippet = { id: crypto.randomUUID(), name, content, createdAt: Date.now() };
      snippets = [...snippets, snippet];
      await saveMeta('snippets');
      return snippet;
    },

    async deleteSnippet(id) {
      snippets = snippets.filter((s) => s.id !== id);
      await saveMeta('snippets');
    },

    async listTerms() {
      return [...terms].sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));
    },

    async createTerm(init) {
      const now = Date.now();
      const term: Term = { id: crypto.randomUUID(), expansion: '', definition: '', tags: [], createdAt: now, updatedAt: now, ...init };
      terms = [...terms, term];
      await saveMeta('terms');
      return term;
    },

    async updateTerm(id, patch) {
      const prev = terms.find((t) => t.id === id);
      if (!prev) return undefined;
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      terms = terms.map((t) => (t.id === id ? next : t));
      await saveMeta('terms');
      return next;
    },

    async deleteTerm(id) {
      terms = terms.filter((t) => t.id !== id);
      await saveMeta('terms');
    },

    async listEvents() {
      return [...events].sort((a, b) => a.date.localeCompare(b.date));
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
      events = [...events, event];
      await saveMeta('events');
      return event;
    },

    async updateEvent(id, patch) {
      const prev = events.find((e) => e.id === id);
      if (!prev) return undefined;
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      events = events.map((e) => (e.id === id ? next : e));
      await saveMeta('events');
      return next;
    },

    async deleteEvent(id) {
      events = events.filter((e) => e.id !== id);
      await saveMeta('events');
    },

    async replaceSyncedEvents(source, fresh) {
      events = [...events.filter((e) => e.source !== source), ...fresh];
      await saveMeta('events');
    },

    async putFile(blob, meta) {
      const id = crypto.randomUUID();
      const mimeType = meta?.mimeType ?? (blob.type || undefined);
      const fallback = `${mimeType?.startsWith('image/') ? 'Bild' : 'Datei'} ${id.slice(0, 8)}.${extFromMime[mimeType ?? ''] ?? 'bin'}`;
      const path = await allocFilePath(meta?.name || fallback);
      const entry: FileEntry = { id, path, name: meta?.name, mimeType, size: blob.size };
      files = [...files, entry];
      await Promise.all([write(path, blob), saveMeta('files')]);
      return id;
    },

    async getFile(id) {
      const entry = files.find((f) => f.id === id);
      return entry ? readStoredFile(entry) : undefined;
    },

    async getFileMeta(id) {
      const entry = files.find((f) => f.id === id);
      if (!entry) return undefined;
      return { id, name: entry.name, mimeType: entry.mimeType, size: entry.size };
    },

    async dumpAll() {
      const stored: StoredFile[] = [];
      for (const entry of files) {
        const blob = await readStoredFile(entry);
        if (blob) stored.push({ id: entry.id, blob, name: entry.name, mimeType: entry.mimeType, size: entry.size });
      }
      return {
        notes: [...notes.values()],
        tags: [...tags],
        snippets: [...snippets],
        terms: [...terms],
        events: [...events],
        files: stored,
      };
    },

    async mergeAll(dump: StorageDump) {
      const result = { added: 0, updated: 0, skipped: 0 };
      const jobs: Promise<unknown>[] = [];
      for (const note of dump.notes) {
        const prev = notes.get(note.id);
        if (!prev) result.added++;
        else if (note.updatedAt > prev.updatedAt) result.updated++;
        else {
          result.skipped++;
          continue;
        }
        notes.set(note.id, note);
        jobs.push(persistNote(note));
      }
      // Tags, Snippets und Dateien ändern sich unter derselben ID nicht inhaltlich – nur Fehlendes ergänzen.
      const missing = <T extends { id: string }>(have: T[], incoming: T[] | undefined) => (incoming ?? []).filter((x) => !have.some((h) => h.id === x.id));
      const newTags = missing(tags, dump.tags);
      if (newTags.length) {
        tags = [...tags, ...newTags];
        jobs.push(saveMeta('tags'));
      }
      const newSnippets = missing(snippets, dump.snippets);
      if (newSnippets.length) {
        snippets = [...snippets, ...newSnippets];
        jobs.push(saveMeta('snippets'));
      }
      // Glossar und Termine: bei gleicher ID gewinnt die jüngere Fassung.
      const newer = <T extends { id: string; updatedAt: number }>(have: T[], incoming: T[] | undefined) => {
        let changed = false;
        const byId = new Map(have.map((x) => [x.id, x]));
        for (const x of incoming ?? []) {
          const prev = byId.get(x.id);
          if (!prev || x.updatedAt > prev.updatedAt) {
            byId.set(x.id, x);
            changed = true;
          }
        }
        return changed ? [...byId.values()] : null;
      };
      const mergedTerms = newer(terms, dump.terms);
      if (mergedTerms) {
        terms = mergedTerms;
        jobs.push(saveMeta('terms'));
      }
      const mergedEvents = newer(events, dump.events);
      if (mergedEvents) {
        events = mergedEvents;
        jobs.push(saveMeta('events'));
      }
      const newFiles = dump.files.filter((f) => !files.some((h) => h.id === f.id));
      for (const f of newFiles) {
        const name = f.name || `${f.blob.type.startsWith('image/') ? 'Bild' : 'Datei'} ${f.id.slice(0, 8)}.${extFromMime[f.mimeType ?? f.blob.type] ?? 'bin'}`;
        const path = await allocFilePath(name);
        files = [...files, { id: f.id, path, name: f.name, mimeType: f.mimeType ?? (f.blob.type || undefined), size: f.size ?? f.blob.size }];
        jobs.push(write(path, f.blob));
      }
      if (newFiles.length) {
        jobs.push(saveMeta('files'));
        // Spiegel nach dem Import neu schreiben, damit Bild-Links auf die nun vorhandenen Anhänge zeigen.
        remirrorAll();
      }
      await Promise.all(jobs);
      return result;
    },
  };

  // Spiegel, die fehlen (z. B. nach einem Import von außen), beim Öffnen nachziehen.
  let i = 0;
  for (const [id, stem] of stems) if (!scannedNames.has((stem + MIRROR_EXT).toLowerCase())) scheduleMirror(id, 3000 + i++ * 20);

  return adapter;
}

/** Hat der Ordner schon Mitschrift-Daten? */
export async function folderHasVault(dir: FileSystemDirectoryHandle) {
  for await (const entry of dir.values()) {
    if (entry.name === META_DIR || (entry.kind === 'file' && entry.name.endsWith(NOTE_EXT))) return true;
  }
  return false;
}
