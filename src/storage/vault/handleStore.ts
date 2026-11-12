import { openDB } from 'idb';

/**
 * Merkt sich das Directory-Handle des gewählten Ordners. Handles lassen sich nur in IndexedDB
 * ablegen (nicht in localStorage) – eigene kleine DB, damit die Notiz-DB kein Upgrade braucht.
 */
const dbPromise = openDB('mitschrift-vault', 1, {
  upgrade(db) {
    db.createObjectStore('kv');
  },
});

const KEY = 'folder';

export async function loadFolderHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return (await (await dbPromise).get('kv', KEY)) as FileSystemDirectoryHandle | undefined;
  } catch {
    return undefined;
  }
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle) {
  await (await dbPromise).put('kv', handle, KEY);
}

export async function clearFolderHandle() {
  await (await dbPromise).delete('kv', KEY);
}
