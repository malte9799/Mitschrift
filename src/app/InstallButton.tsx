import { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/ui/Icon';
import { folderSupported } from '@/storage/vault';
import '@/styles/install.css';

/** Chromiums Install-Ereignis (nicht in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mitschrift-install-dismissed';

// Schon beim Laden des Moduls lauschen – das Ereignis kommt oft, bevor die Seitenleiste steht.
let deferred: BeforeInstallPromptEvent | null = null;
let installed = typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // eigene Schaltfläche statt Browser-Leiste
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
}

function useInstallState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (installed ? 'installed' : deferred ? 'prompt' : 'none'),
  );
}

/** Safari kann installieren, aber nur über das eigene Menü – dafür zeigen wir die Anleitung. */
function safariHint(): string | null {
  const ua = navigator.userAgent;
  const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(ua);
  if (!isSafari) return null;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  return ios ? 'Tippe auf „Teilen“ und dann „Zum Home-Bildschirm“.' : 'Wähle in Safari „Ablage“ → „Zum Dock hinzufügen“.';
}

/** Schmaler „App installieren“-Knopf für die Fußzeile der Seitenleiste; `null`, wenn es nichts anzubieten gibt. */
export function InstallButton() {
  const state = useInstallState();
  // Im Dev-Server gibt es keinen Service Worker und damit kein Install-Ereignis – Knopf trotzdem zeigen.
  const [hint] = useState(
    () => safariHint() ?? (import.meta.env.DEV ? 'Im Dev-Server nicht installierbar (kein Service Worker). Zum Testen: npm run build && npm run preview' : null),
  );
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(t);
  }, [showHint]);

  if (dismissed || state === 'installed' || (state === 'none' && !hint)) return null;

  async function install() {
    if (deferred) {
      const ev = deferred;
      deferred = null; // prompt() geht nur einmal pro Ereignis
      emit();
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') {
        installed = true;
        emit();
      }
    } else {
      setShowHint((s) => !s);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* nur Komfort */
    }
    setDismissed(true);
  }

  return (
    <div className={`install${showHint ? ' is-hint' : ''}`}>
      <div className="install-pop" role="tooltip" id="install-pop">
        {showHint && hint ? (
          <p className="install-pop-hint">{hint}</p>
        ) : (
          <>
            <p className="install-pop-title">Als App installieren</p>
            <ul>
              <li>Eigenes Fenster wie eine native App</li>
              <li>Funktioniert auch offline</li>
              {folderSupported && <li>Notizen direkt in einem Ordner auf deinem Rechner speichern</li>}
            </ul>
          </>
        )}
      </div>
      <button type="button" className="install-btn" onClick={() => void install()} aria-describedby="install-pop">
        <Icon name="download" className="install-ico" />
        <span>App installieren</span>
      </button>
      <button type="button" className="install-x" onClick={dismiss} aria-label="Hinweis ausblenden" title="Ausblenden">
        <Icon name="x" />
      </button>
    </div>
  );
}
