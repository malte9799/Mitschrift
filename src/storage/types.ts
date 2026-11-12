/** Eine Mitschrift. `content` ist das Tiptap-JSON als String. */
export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  /** Übergeordnete Notiz (Verschachtelung); `null`/fehlend = oberste Ebene. */
  parentId?: string | null;
  tags: string[];
  starred: boolean;
  /** Als Vorlage markiert: erscheint unter „Neue Notiz aus Vorlage“. */
  template?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'folder' | 'parentId' | 'tags' | 'starred' | 'template'>>;

/** Farbton eines Tags; die konkreten Werte (hell/dunkel) stehen in tokens.css. */
export type TagColor = 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'graphite' | 'red' | 'pink' | 'amber';

/** Tag für Notizen, z. B. ein Schulfach. Notizen speichern die Tag-IDs in `tags`. */
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  createdAt: number;
}

export type TagPatch = Partial<Pick<Tag, 'name' | 'color'>>;

/** Gespeicherter Block-Ausschnitt, einfügbar über das Slash-Menü. */
export interface Snippet {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

/** Glossar-Eintrag, z. B. eine Abkürzung („DNS“ → „Domain Name System“). Wird in allen Notizen erkannt. */
export interface Term {
  id: string;
  /** Wie er im Text steht: „DNS“, „TCP/IP“, „Firewall“. */
  term: string;
  /** Ausgeschrieben bzw. Kurzbedeutung. */
  expansion: string;
  /** Längere Erklärung (optional). */
  definition: string;
  /** Fächer (Tag-IDs). */
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type TermPatch = Partial<Pick<Term, 'term' | 'expansion' | 'definition' | 'tags'>>;

/** Woher ein Termin stammt. Von Hand angelegte Termine sind `manual`; Integrationen liefern den Rest. */
export type CalendarSource = 'manual' | 'untis' | 'itslearning';

/** Ein Termin im Kalender, optional mit einer Notiz verknüpft. */
export interface CalendarEvent {
  id: string;
  title: string;
  /** Datum als „YYYY-MM-DD“ (lokal, ohne Uhrzeit-Zeitzonen-Ärger). */
  date: string;
  /** „HH:MM“, oder leer für einen ganztägigen Termin. */
  time: string;
  /** „HH:MM“, oder leer ohne bekanntes Ende (z. B. bei manuellen Terminen). */
  endTime: string;
  notes: string;
  noteId: string | null;
  tags: string[];
  /** Herkunft; `manual` ist von Hand angelegt und in der Kalender-UI editierbar. */
  source: CalendarSource;
  /** Erledigt (z. B. abgehakte Aufgabe/Kanban-Karte mit Fälligkeitsdatum). Fehlt bei älteren Terminen = false. */
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CalendarEventPatch = Partial<Pick<CalendarEvent, 'title' | 'date' | 'time' | 'endTime' | 'notes' | 'noteId' | 'tags' | 'completed'>>;

/** Gespeicherte Datei; `name`/`mimeType`/`size` fehlen bei älteren Einträgen (z. B. Bildern vor diesem Feld). */
export interface StoredFile {
  id: string;
  blob: Blob;
  name?: string;
  mimeType?: string;
  size?: number;
}

/**
 * Speicher-Grenze der App. V1 nutzt IndexedDB, später kann ein Tauri-Adapter
 * (Markdown-Dateien auf Disk) dieselbe Schnittstelle implementieren.
 */
export interface StorageAdapter {
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(init?: NotePatch): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<Note | undefined>;
  /** Löscht die Notiz; ihre Unterseiten rücken eine Ebene nach oben. */
  deleteNote(id: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(name: string, color: TagColor): Promise<Tag>;
  updateTag(id: string, patch: TagPatch): Promise<Tag | undefined>;
  /** Löscht das Tag und entfernt es aus allen Notizen. */
  deleteTag(id: string): Promise<void>;
  /** Vereint zwei Tags zu einem: Alle Verweise auf `sourceId` (Notizen, Glossar, Termine) gehen auf `targetId` über, `sourceId` verschwindet. */
  mergeTag(sourceId: string, targetId: string): Promise<void>;

  listSnippets(): Promise<Snippet[]>;
  createSnippet(name: string, content: string): Promise<Snippet>;
  deleteSnippet(id: string): Promise<void>;

  listTerms(): Promise<Term[]>;
  createTerm(init: TermPatch & { term: string }): Promise<Term>;
  updateTerm(id: string, patch: TermPatch): Promise<Term | undefined>;
  deleteTerm(id: string): Promise<void>;

  listEvents(): Promise<CalendarEvent[]>;
  createEvent(init: CalendarEventPatch & { date: string }): Promise<CalendarEvent>;
  updateEvent(id: string, patch: CalendarEventPatch): Promise<CalendarEvent | undefined>;
  deleteEvent(id: string): Promise<void>;
  /**
   * Ersetzt alle Termine einer Integrationsquelle (z. B. `untis`) durch die frisch abgerufenen.
   * Von Hand angelegte Termine (`manual`) bleiben unberührt.
   */
  replaceSyncedEvents(source: Exclude<CalendarSource, 'manual'>, events: CalendarEvent[]): Promise<void>;

  putFile(blob: Blob, meta?: { name?: string; mimeType?: string }): Promise<string>;
  getFile(id: string): Promise<Blob | undefined>;
  /** Nur die Metadaten (ohne den Blob), z. B. für die Anzeige eines Anhangs. */
  getFileMeta(id: string): Promise<Omit<StoredFile, 'blob'> | undefined>;

  /** Kompletter Inhalt des Speichers, z. B. für ein Backup. */
  dumpAll(): Promise<StorageDump>;
  /**
   * Führt einen Dump mit dem Bestand zusammen: Notizen gewinnen bei gleicher ID die
   * jüngere Fassung, alles andere wird nur ergänzt. Es wird nie etwas gelöscht.
   */
  mergeAll(dump: StorageDump): Promise<MergeResult>;
}

export interface StorageDump {
  notes: Note[];
  tags: Tag[];
  snippets: Snippet[];
  files: StoredFile[];
}

export interface MergeResult {
  added: number;
  updated: number;
  skipped: number;
}
