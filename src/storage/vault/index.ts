import { useSyncExternalStore } from 'react';
import { setActiveStorage, storage } from '..';
import { idbAdapter } from '../idbAdapter';
import { clearFolderHandle, loadFolderHandle, saveFolderHandle } from './handleStore';
import { folderHasVault, openFolderAdapter } from './folderAdapter';

/**
 * Wo die Notizen liegen. Beim Start entschieden (`initStorage`), danach nur per Neuladen gewechselt –
 * so lesen alle Ansichten und Caches garantiert aus demselben Speicher.
 */
export type VaultState =
  | { kind: 'browser' }
  | { kind: 'folder'; name: string }
  /** Ordner gemerkt, aber der Browser will den Zugriff erst bestätigt haben (Klick nötig). */
  | { kind: 'needs-permission'; name: string }
  /** Ordner gemerkt, aber nicht mehr lesbar (gelöscht, verschoben, Zugriff verweigert). */
  | { kind: 'error'; name: string; message: string };

/** Chrome/Edge (Desktop) können Ordner öffnen; Firefox und Safari nicht – dort bleibt es beim Browser-Speicher. */
export const folderSupported = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

let state: VaultState = { kind: 'browser' };
let pendingHandle: FileSystemDirectoryHandle | null = null;
const listeners = new Set<() => void>();

function setState(next: VaultState) {
  state = next;
  for (const l of listeners) l();
}

export function useVaultState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

async function activate(handle: FileSystemDirectoryHandle) {
  const adapter = await openFolderAdapter(handle);
  setActiveStorage(adapter);
  adapter.watch();
  setState({ kind: 'folder', name: handle.name });
}

function describe(err: unknown) {
  if (err instanceof DOMException && err.name === 'NotFoundError') return 'Der Ordner wurde nicht gefunden – vielleicht verschoben, umbenannt oder gelöscht.';
  if (err instanceof DOMException && err.name === 'NotAllowedError') return 'Der Zugriff auf den Ordner wurde verweigert.';
  return err instanceof Error ? err.message : String(err);
}

/** Vor dem ersten Rendern aufrufen: öffnet den gemerkten Ordner, falls es einen gibt und der Zugriff steht. */
export async function initStorage(): Promise<VaultState> {
  if (!folderSupported) return state;
  const handle = await loadFolderHandle();
  if (!handle) return state;
  pendingHandle = handle;
  try {
    const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (perm !== 'granted') {
      setState({ kind: 'needs-permission', name: handle.name });
      return state;
    }
    await activate(handle);
  } catch (err) {
    console.error(err);
    setState({ kind: 'error', name: handle.name, message: describe(err) });
  }
  return state;
}

/** Klick auf „Zugriff erlauben“: fragt den Browser und öffnet bei Erfolg den Ordner. */
export async function grantAccess(): Promise<VaultState> {
  const handle = pendingHandle;
  if (!handle) return state;
  try {
    const perm = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (perm !== 'granted') {
      setState({ kind: 'needs-permission', name: handle.name });
      return state;
    }
    await activate(handle);
  } catch (err) {
    console.error(err);
    setState({ kind: 'error', name: handle.name, message: describe(err) });
  }
  return state;
}

export interface ChooseFolderOptions {
  /**
   * Fragt, ob die bisherigen Notizen in den neuen Ordner übernommen werden sollen.
   * `false` = nicht übernehmen; `null` = ganz abbrechen.
   */
  confirmMigration(info: { folderName: string; folderHasData: boolean; count: number; fromFolder: boolean }): Promise<boolean | null>;
}

/**
 * Ordner wählen (muss aus einem Klick heraus aufgerufen werden), bisherige Daten auf Wunsch hinein
 * übernehmen und den Ordner merken. Danach lädt die App neu. Liefert `false`, wenn abgebrochen.
 */
export async function chooseFolder(opts: ChooseFolderOptions): Promise<boolean> {
  if (!window.showDirectoryPicker) return false;
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ id: 'mitschrift', mode: 'readwrite', startIn: 'documents' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
  // Notizen aus dem aktuell genutzten Speicher (Browser oder bisheriger Ordner) mitnehmen.
  const source = state.kind === 'folder' ? storage : idbAdapter;
  const dump = await source.dumpAll();
  const count = dump.notes.length;
  if (count > 0) {
    const migrate = await opts.confirmMigration({
      folderName: handle.name,
      folderHasData: await folderHasVault(handle),
      count,
      fromFolder: state.kind === 'folder',
    });
    if (migrate === null) return false;
    if (migrate) {
      const target = await openFolderAdapter(handle);
      await target.mergeAll(dump);
    }
  }
  await saveFolderHandle(handle);
  location.reload();
  return true;
}

/**
 * Ordner trennen: Die App nutzt wieder den Browser-Speicher. Die Dateien bleiben im Ordner;
 * auf Wunsch werden die Notizen vorher in den Browser übernommen.
 */
export async function disconnectFolder(copyToBrowser: boolean) {
  if (copyToBrowser && state.kind === 'folder') await idbAdapter.mergeAll(await storage.dumpAll());
  await clearFolderHandle();
  location.reload();
}
