import { useState } from 'react';
import { isRouteErrorResponse, useParams, useRouteError } from 'react-router-dom';
import { storage } from '@/storage';

/** Seite nicht gefunden (404) vs. echter Absturz beim Anzeigen. */
function describe(error: unknown): { title: string; text: string; detail: string | null } {
  // Ohne Fehler-Objekt: als Fallback-Route (`*`) für unbekannte Adressen gerendert.
  if (error == null || (isRouteErrorResponse(error) && error.status === 404)) {
    return { title: 'Seite nicht gefunden', text: 'Diese Adresse gibt es in Mitschrift nicht.', detail: null };
  }
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return {
    title: 'Hier ist etwas schiefgelaufen',
    text: 'Diese Ansicht konnte nicht angezeigt werden. Deine übrigen Notizen sind davon nicht betroffen.',
    detail,
  };
}

const home = () => window.location.assign(import.meta.env.BASE_URL);

/**
 * Fehlerseite statt weißem Bildschirm. Innerhalb des Layouts bleiben Menü- und Seitenleiste
 * nutzbar; bei einer Notiz lässt sich der Rohinhalt sichern, um nichts zu verlieren.
 */
export function ErrorPage() {
  const error = useRouteError();
  const { id } = useParams<{ id: string }>();
  const { title, text, detail } = describe(error);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  async function copyRaw() {
    if (!id) return;
    try {
      const note = await storage.getNote(id);
      await navigator.clipboard.writeText(JSON.stringify(note ?? null, null, 2));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  }

  return (
    <div className="vault-gate error-page" role="alert">
      <div className="vault-gate-card">
        <span className="mb-about-logo" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="vault-gate-actions">
          <button type="button" className="b-btn b-btn-primary" onClick={home} autoFocus>
            Zur Übersicht
          </button>
          <button type="button" className="b-btn" onClick={() => window.location.reload()}>
            Neu laden
          </button>
          {id && detail && (
            <button type="button" className="b-btn vault-gate-plain" onClick={() => void copyRaw()}>
              {copied === 'ok' ? 'Rohinhalt kopiert' : copied === 'fail' ? 'Kopieren fehlgeschlagen' : 'Rohinhalt der Notiz kopieren'}
            </button>
          )}
        </div>
        {detail && (
          <details className="error-detail">
            <summary>Technische Details</summary>
            <code>{detail}</code>
          </details>
        )}
      </div>
    </div>
  );
}
