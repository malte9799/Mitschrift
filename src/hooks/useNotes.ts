import { useSyncExternalStore } from 'react';
import { storage, type Note } from '@/storage';

/*
 * Gemeinsamer Store: Alle `useNotes()`-Aufrufe (Seitenleiste, Menü, Startseite …) teilen sich eine Liste
 * und einen Ladevorgang pro Änderung – statt dass jede Hook-Instanz bei jedem Autosave selbst `listNotes()` ruft.
 */

const listeners = new Set<() => void>();
let notes: Note[] | null = null;
/** Es gab Änderungen, während niemand zugehört hat – beim nächsten Abonnieren neu laden. */
let stale = true;
let scheduled = false;
/** Nur die jüngste Antwort zählt: ältere, später eintreffende Ladevorgänge werden verworfen. */
let seq = 0;

function emit() {
  for (const l of listeners) l();
}

async function load() {
  const mine = ++seq;
  stale = false;
  try {
    const list = await storage.listNotes();
    if (mine !== seq) return;
    notes = list;
    emit();
  } catch (err) {
    if (mine === seq) stale = true;
    console.error('Notizen konnten nicht geladen werden', err);
  }
}

/** Plant einen Ladevorgang; mehrere Aufrufe im selben Tick werden gebündelt. */
function scheduleLoad() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    void load();
  });
}

/** Signalisiert allen Listen, dass sich Notizen geändert haben. */
export function notifyNotesChanged() {
  stale = true;
  if (listeners.size) scheduleLoad();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (stale) scheduleLoad();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => notes;

/** Alle Notizen, neueste Änderung zuerst; aktualisiert sich bei jeder Änderung. */
export function useNotes() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
