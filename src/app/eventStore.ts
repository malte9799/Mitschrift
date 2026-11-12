import { useSyncExternalStore } from 'react';
import { storage, type CalendarEvent, type CalendarEventPatch, type CalendarSource } from '@/storage';

/**
 * Termine im Speicher gehalten, analog zum Glossar: Seiten lesen synchron denselben Stand,
 * ohne dass jede Ansicht einzeln laden und auf Änderungen anderer Ansichten reagieren muss.
 */
let events: CalendarEvent[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function ensureLoaded() {
  loading ??= storage.listEvents().then((e) => {
    events = e;
    loaded = true;
    emit();
  });
  return loading;
}

export function subscribeEvents(l: () => void) {
  listeners.add(l);
  void ensureLoaded();
  return () => {
    listeners.delete(l);
  };
}

export const getEvents = () => events;

const sortEvents = (list: CalendarEvent[]) => [...list].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

/** Alle Termine (nach Datum sortiert); `null`, solange sie noch laden. */
export function useEvents(): CalendarEvent[] | null {
  return useSyncExternalStore(subscribeEvents, () => (loaded ? events : null));
}

export async function createEvent(init: CalendarEventPatch & { date: string }) {
  await ensureLoaded();
  const e = await storage.createEvent({ ...init, title: init.title?.trim() ?? '' });
  events = sortEvents([...events, e]);
  emit();
  return e;
}

export async function updateEvent(id: string, patch: CalendarEventPatch) {
  const e = await storage.updateEvent(id, patch);
  if (!e) return undefined;
  events = sortEvents(events.map((x) => (x.id === id ? e : x)));
  emit();
  return e;
}

export async function deleteEvent(id: string) {
  await storage.deleteEvent(id);
  events = events.filter((e) => e.id !== id);
  emit();
}

/** Ersetzt alle Termine einer Integration (z. B. nach einem Untis-Abruf). Von Hand angelegte bleiben unberührt. */
export async function syncEvents(source: Exclude<CalendarSource, 'manual'>, fresh: CalendarEvent[]) {
  await ensureLoaded();
  await storage.replaceSyncedEvents(source, fresh);
  events = sortEvents([...events.filter((e) => e.source !== source), ...fresh]);
  emit();
}

/** Termine neu aus dem Speicher lesen, z. B. nach einer Änderung von außen im Notiz-Ordner. */
export async function reloadEvents() {
  events = await storage.listEvents();
  loaded = true;
  emit();
}

// ---------- Bearbeiten-Dialog ----------

/** Öffnet den Termin-Dialog (EventDialogHost): neuer Termin mit Vorschlag oder vorhandener Termin. */
export const OPEN_EVENT_EVENT = 'mitschrift:open-event';

export interface OpenEventDetail {
  id?: string;
  /** Vorbelegtes Datum („YYYY-MM-DD“) für einen neuen Termin. */
  date?: string;
}

export function openEventDialog(detail: OpenEventDetail) {
  window.dispatchEvent(new CustomEvent<OpenEventDetail>(OPEN_EVENT_EVENT, { detail }));
}
