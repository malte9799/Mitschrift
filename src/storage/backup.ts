import { storage } from '.';
import type { MergeResult, Note, StorageDump } from './types';

/**
 * Voll-Backup als eine JSON-Datei; Dateien (Bilder usw.) stecken als Data-URL darin.
 * Version 2 enthält zusätzlich Glossar, Termine und Datei-Metadaten (Name, Typ, Größe);
 * Version-1-Backups lassen sich weiter einspielen.
 */
interface BackupFile {
  app: 'mitschrift';
  version: 1 | 2;
  exportedAt: number;
  notes: StorageDump['notes'];
  tags: StorageDump['tags'];
  snippets: StorageDump['snippets'];
  terms?: StorageDump['terms'];
  events?: StorageDump['events'];
  files: { id: string; dataUrl: string; name?: string; mimeType?: string; size?: number }[];
}

const BACKUP_VERSION = 2;

const LAST_BACKUP_KEY = 'mitschrift:lastBackup';

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}

/** Lädt alle Notizen, Tags, Snippets, Glossar, Termine und Dateien als `.json` herunter. */
export async function downloadBackup() {
  const dump = await storage.dumpAll();
  const backup: BackupFile = {
    app: 'mitschrift',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    notes: dump.notes,
    tags: dump.tags,
    snippets: dump.snippets,
    terms: dump.terms ?? [],
    events: dump.events ?? [],
    files: await Promise.all(
      dump.files.map(async (f) => ({ id: f.id, dataUrl: await blobToDataUrl(f.blob), name: f.name, mimeType: f.mimeType, size: f.size })),
    ),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mitschrift-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(backup.exportedAt));
  } catch {
    // Nur Komfort-Anzeige – ohne localStorage geht es auch.
  }
  return { notes: dump.notes.length, files: dump.files.length };
}

/**
 * Notiz aus einem Backup prüfen und fehlende Felder auffüllen – eine von Hand bearbeitete
 * oder kaputte Datei soll nicht später die Seitenleiste zum Absturz bringen. `null` = unbrauchbar.
 */
function sanitizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Partial<Note>;
  if (typeof n.id !== 'string' || !n.id) return null;
  const now = Date.now();
  const createdAt = typeof n.createdAt === 'number' ? n.createdAt : now;
  return {
    ...n,
    id: n.id,
    title: typeof n.title === 'string' ? n.title : '',
    content: typeof n.content === 'string' ? n.content : '',
    folder: typeof n.folder === 'string' ? n.folder : null,
    parentId: typeof n.parentId === 'string' ? n.parentId : null,
    tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === 'string') : [],
    starred: n.starred === true,
    createdAt,
    updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : createdAt,
  };
}

/** Zeitpunkt des letzten Backups aus diesem Browser, falls bekannt. */
export function lastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Liest eine Backup-Datei ein; wirft bei fremden oder kaputten Dateien. */
export async function readBackup(file: File): Promise<{ dump: StorageDump; exportedAt: number }> {
  let data: BackupFile;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (data?.app !== 'mitschrift' || !Array.isArray(data.notes)) throw new Error('Die Datei ist kein Mitschrift-Backup.');
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) throw new Error('Das Backup stammt aus einer neueren Version von Mitschrift.');
  const notes = data.notes.map(sanitizeNote).filter((n): n is Note => n !== null);
  const list = <T>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  return {
    exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : Date.now(),
    dump: {
      notes,
      tags: list(data.tags),
      snippets: list(data.snippets),
      terms: list(data.terms),
      events: list(data.events),
      files: await Promise.all(
        list(data.files)
          .filter((f) => typeof f?.id === 'string' && typeof f.dataUrl === 'string')
          .map(async (f) => ({ id: f.id, blob: await dataUrlToBlob(f.dataUrl), name: f.name, mimeType: f.mimeType, size: f.size })),
      ),
    },
  };
}

export function restoreBackup(dump: StorageDump): Promise<MergeResult> {
  return storage.mergeAll(dump);
}
