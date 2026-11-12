/** Was sich von außen (anderes Programm, anderer Tab, Sync-Dienst) im Notiz-Ordner geändert hat. */
export interface ExternalChange {
  /** IDs geänderter, neuer oder gelöschter Notizen. */
  notes: string[];
  tags: boolean;
  snippets: boolean;
  terms: boolean;
  events: boolean;
}

const EXTERNAL_CHANGE_EVENT = 'mitschrift:external-change';
const STORAGE_ERROR_EVENT = 'mitschrift:storage-error';

export function emitExternalChange(change: ExternalChange) {
  window.dispatchEvent(new CustomEvent<ExternalChange>(EXTERNAL_CHANGE_EVENT, { detail: change }));
}

export function onExternalChange(cb: (change: ExternalChange) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ExternalChange>).detail);
  window.addEventListener(EXTERNAL_CHANGE_EVENT, handler);
  return () => window.removeEventListener(EXTERNAL_CHANGE_EVENT, handler);
}

/** Schreiben in den Ordner ist fehlgeschlagen (z. B. Zugriff entzogen, Ordner gelöscht). */
export function emitStorageError(error: unknown) {
  window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: error }));
}

export function onStorageError(cb: (error: unknown) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(STORAGE_ERROR_EVENT, handler);
  return () => window.removeEventListener(STORAGE_ERROR_EVENT, handler);
}
