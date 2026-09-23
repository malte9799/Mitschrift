import { storage } from '.';
import type { MergeResult, StorageDump } from './types';

/** Voll-Backup als eine JSON-Datei; Dateien (Bilder usw.) stecken als Data-URL darin. */
interface BackupFile {
  app: 'mitschrift';
  version: 1;
  exportedAt: number;
  notes: StorageDump['notes'];
  tags: StorageDump['tags'];
  snippets: StorageDump['snippets'];
  files: { id: string; dataUrl: string }[];
}

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

/** Lädt alle Notizen, Tags, Snippets und Dateien als `.json` herunter. */
export async function downloadBackup() {
  const dump = await storage.dumpAll();
  const backup: BackupFile = {
    app: 'mitschrift',
    version: 1,
    exportedAt: Date.now(),
    notes: dump.notes,
    tags: dump.tags,
    snippets: dump.snippets,
    files: await Promise.all(dump.files.map(async (f) => ({ id: f.id, dataUrl: await blobToDataUrl(f.blob) }))),
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
  if (data.version > 1) throw new Error('Das Backup stammt aus einer neueren Version von Mitschrift.');
  return {
    exportedAt: data.exportedAt,
    dump: {
      notes: data.notes,
      tags: data.tags ?? [],
      snippets: data.snippets ?? [],
      files: await Promise.all((data.files ?? []).map(async (f) => ({ id: f.id, blob: await dataUrlToBlob(f.dataUrl) }))),
    },
  };
}

export function restoreBackup(dump: StorageDump): Promise<MergeResult> {
  return storage.mergeAll(dump);
}
