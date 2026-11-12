import { useState } from 'react';
import { chooseFolder, disconnectFolder, grantAccess, useVaultState } from '@/storage/vault';

/**
 * Startbildschirm, wenn der gemerkte Notiz-Ordner nicht ohne Weiteres geöffnet werden kann:
 * Der Browser verlangt nach einem Neustart einen Klick, bevor er den Zugriff wieder freigibt.
 */
export function VaultGate({ onReady }: { onReady: () => void }) {
  const state = useVaultState();
  const [busy, setBusy] = useState(false);
  if (state.kind !== 'needs-permission' && state.kind !== 'error') return null;

  async function allow() {
    setBusy(true);
    const next = await grantAccess();
    setBusy(false);
    if (next.kind === 'folder') onReady();
  }

  async function other() {
    setBusy(true);
    try {
      // Aus dem alten Ordner lässt sich ohne Zugriff nichts übernehmen – nur wechseln.
      await chooseFolder({ confirmMigration: async () => false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-gate">
      <div className="vault-gate-card" role="dialog" aria-modal="true" aria-labelledby="vault-gate-title">
        <span className="mb-about-logo" aria-hidden="true" />
        <h1 id="vault-gate-title">{state.kind === 'error' ? 'Notiz-Ordner nicht erreichbar' : 'Notiz-Ordner öffnen'}</h1>
        {state.kind === 'error' ? (
          <p>
            Der Ordner <strong>„{state.name}“</strong> lässt sich nicht öffnen. {state.message}
          </p>
        ) : (
          <p>
            Mitschrift speichert deine Notizen im Ordner <strong>„{state.name}“</strong>. Erlaube den Zugriff, damit sie geladen werden
            können.
          </p>
        )}
        <div className="vault-gate-actions">
          {state.kind === 'needs-permission' && (
            <button type="button" className="b-btn b-btn-primary" onClick={allow} disabled={busy} autoFocus>
              Zugriff erlauben
            </button>
          )}
          <button type="button" className="b-btn" onClick={other} disabled={busy} autoFocus={state.kind === 'error'}>
            Anderen Ordner wählen …
          </button>
          <button type="button" className="b-btn vault-gate-plain" onClick={() => void disconnectFolder(false)} disabled={busy}>
            Browser-Speicher verwenden
          </button>
        </div>
        <p className="vault-gate-hint">
          {state.kind === 'needs-permission'
            ? 'Tipp: Als App installiert, kann Chrome sich den Zugriff dauerhaft merken („Bei jedem Besuch erlauben“).'
            : 'Die Dateien im Ordner werden dabei nicht verändert.'}
        </p>
      </div>
    </div>
  );
}
