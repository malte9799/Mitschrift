import { useSyncExternalStore } from 'react';

/**
 * Zoom nur für den Dokumentinhalt (Notizen, Handbuch) – Menü- und Seitenleisten bleiben gleich groß.
 * Ersetzt den Browser-Zoom (⌘+/⌘−/⌘0, Strg/⌘ + Mausrad bzw. Trackpad-Pinch), der die ganze Seite skaliert.
 */
const KEY = 'mitschrift-doc-zoom';
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];
const MIN = ZOOM_STEPS[0];
const MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

const clamp = (z: number) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

function load(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v ? clamp(v) : 1;
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

/**
 * Strg/⌘ + Mausrad und Trackpad-Pinch (kommt im Browser als Wheel mit ctrlKey) zoomen das Dokument
 * stufenlos statt die ganze Seite. Blöcke mit eigenem Zoom (Plot, Zeitstrahl, SVG-Editor, Graph)
 * rufen preventDefault() und haben damit Vorrang.
 */
export function installWheelZoom() {
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.defaultPrevented) return;
    e.preventDefault();
    // Pinch liefert kleine, Mausräder große Schritte – exponentiell, damit beides angenehm skaliert.
    const delta = Math.max(-50, Math.min(50, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
    setZoom(zoom * Math.exp(-delta * 0.005));
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  return () => window.removeEventListener('wheel', onWheel);
}
