import { useSyncExternalStore } from 'react';

/**
 * Zoom nur für den Dokumentinhalt (Notizen, Handbuch) – Menü- und Seitenleisten bleiben gleich groß.
 * Ersetzt den Browser-Zoom (⌘+/⌘−/⌘0, Strg/⌘ + Mausrad bzw. Trackpad-Pinch), der die ganze Seite skaliert.
 * Gezoomt wird immer in festen Stufen ({@link ZOOM_STEPS}).
 */
const KEY = 'mitschrift-doc-zoom';
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];
const MIN = ZOOM_STEPS[0];
const MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

const clamp = (z: number) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

function load(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    // Ältere, stufenlos gespeicherte Werte auf die nächste Stufe runden.
    return v ? ZOOM_STEPS.reduce((best, st) => (Math.abs(st - v) < Math.abs(best - v) ? st : best), 1) : 1;
  } catch {
    return 1;
  }
}

let zoom = load();
const listeners = new Set<() => void>();

function apply() {
  document.documentElement.style.setProperty('--doc-zoom', String(zoom));
}
if (typeof document !== 'undefined') apply();

export function setZoom(next: number) {
  const z = clamp(next);
  if (z === zoom) return;
  zoom = z;
  apply();
  try {
    if (z === 1) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(z));
  } catch {
    /* nur Komfort */
  }
  listeners.forEach((l) => l());
}

export function getZoom() {
  return zoom;
}

/** Nächste Stufe nach oben bzw. unten (wie beim Browser-Zoom). */
export function zoomIn() {
  setZoom(ZOOM_STEPS.find((s) => s > zoom + 0.001) ?? MAX);
}
export function zoomOut() {
  setZoom([...ZOOM_STEPS].reverse().find((s) => s < zoom - 0.001) ?? MIN);
}
export function resetZoom() {
  setZoom(1);
}

export function useDocZoom() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => zoom,
  );
}

/** So viel Scroll-Weg (px) braucht es für eine Zoomstufe – ein Mausrad-Raster sind ~100, Pinch liefert kleine Werte. */
const WHEEL_STEP = 60;

/**
 * Strg/⌘ + Mausrad und Trackpad-Pinch (kommt im Browser als Wheel mit ctrlKey) schalten das Dokument
 * in den festen Stufen von {@link ZOOM_STEPS} weiter statt die ganze Seite zu zoomen. Blöcke mit
 * eigenem Zoom (Plot, Zeitstrahl, SVG-Editor, Graph) rufen preventDefault() und haben damit Vorrang.
 */
export function installWheelZoom() {
  let acc = 0;
  let idle = 0;
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.defaultPrevented) return;
    e.preventDefault();
    acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    // Nach einer Pause von vorn zählen, damit eine neue Geste nicht vom Rest der letzten abhängt.
    window.clearTimeout(idle);
    idle = window.setTimeout(() => (acc = 0), 300);
    if (Math.abs(acc) < WHEEL_STEP) return;
    if (acc < 0) zoomIn();
    else zoomOut();
    acc = 0;
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  return () => window.removeEventListener('wheel', onWheel);
}
