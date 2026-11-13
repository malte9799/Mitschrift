import { registerSW } from 'virtual:pwa-register';

/** Wie oft bei offener App nach einer neuen Version gefragt wird. */
const CHECK_EVERY = 30 * 60 * 1000;
/** So lange ohne Eingabe, bevor neu geladen wird – länger als das Speichern verzögert (Editor 300 ms + 400 ms). */
const IDLE_BEFORE_RELOAD = 2500;

let reloading = false;

/**
 * Neue Version laden, sobald es nicht stört: sofort, wenn die App im Hintergrund ist,
 * sonst nach einer kurzen Pause ohne Tippen/Klicken – so sind ausstehende Änderungen schon gespeichert.
 */
function reloadWhenIdle() {
  if (reloading) return;
  reloading = true;
  const reload = () => window.location.reload();
  if (document.visibilityState === 'hidden') return reload();
  let timer = window.setTimeout(reload, IDLE_BEFORE_RELOAD);
  const postpone = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(reload, IDLE_BEFORE_RELOAD);
  };
  for (const ev of ['keydown', 'input', 'pointerdown', 'compositionstart']) window.addEventListener(ev, postpone, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && reload());
}

/**
 * Service Worker registrieren und Updates schnell übernehmen. Ohne das liefert er die App aus dem
 * Cache und zeigt eine neue Version erst beim übernächsten Laden – in der installierten App oft noch später.
 */
export function initPwaUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine && !reloading) void registration.update().catch(() => undefined);
      };
      // Beim Zurückkehren zur App (Fenster/Tab wieder aktiv) und regelmäßig nachsehen.
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      window.addEventListener('focus', check);
      window.setInterval(check, CHECK_EVERY);
    },
    // Neuer Service Worker hat übernommen (skipWaiting) – Seite neu laden, aber nicht mitten im Tippen.
    onNeedReload: reloadWhenIdle,
  });
}
