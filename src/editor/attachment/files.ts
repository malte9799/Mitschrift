import { storage } from '@/storage';

/** Ab dieser Größe zeigt der Block einen Hinweis, lehnt den Upload aber nicht ab. */
export const LARGE_FILE_WARNING_BYTES = 20 * 1024 * 1024;

const urlCache = new Map<string, Promise<string>>();

/** Legt eine beliebige Datei lokal ab und liefert ihre Metadaten (Name, Typ, Größe) plus die `fileId`. */
export async function storeAttachment(file: File): Promise<{ fileId: string; name: string; mimeType: string; size: number }> {
  const fileId = await storage.putFile(file, { name: file.name, mimeType: file.type });
  return { fileId, name: file.name || 'Datei', mimeType: file.type || 'application/octet-stream', size: file.size };
}

/** Löst eine `fileId` in eine Blob-URL auf (für Download-Link/Vorschau), einmal pro Sitzung gecacht. */
export function resolveAttachmentUrl(fileId: string): Promise<string> {
  let url = urlCache.get(fileId);
  if (!url) {
    url = storage.getFile(fileId).then((blob) => (blob ? URL.createObjectURL(blob) : ''));
    urlCache.set(fileId, url);
  }
  return url;
}

/** „1,4 MB“ – grobe, für Menschen lesbare Größenangabe. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
