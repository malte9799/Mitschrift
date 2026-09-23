/**
 * Bittet den Browser, die Daten dieser Seite nicht bei Speichermangel oder Inaktivität
 * zu löschen. Chrome entscheidet heuristisch, Firefox fragt nach, Safari (ab 17) gewährt es meist.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export interface StorageStatus {
  /** `null`, wenn der Browser die API nicht kennt. */
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}

export async function storageStatus(): Promise<StorageStatus> {
  const s = navigator.storage;
  const [persisted, estimate] = await Promise.all([
    s?.persisted ? s.persisted().catch(() => null) : null,
    s?.estimate ? s.estimate().catch(() => null) : null,
  ]);
  return { persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null };
}
