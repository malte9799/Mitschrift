import { createEvent, deleteEvent, updateEvent } from '@/app/eventStore';

/**
 * Verknüpft eine Aufgabenzeile (oder Kanban-Karte) mit einem Kalendertermin, sobald ein
 * Fälligkeitsdatum gesetzt ist. Ein Termin entsteht erst beim ersten Datum; danach wird derselbe
 * Termin (per `eventId`) weiter aktualisiert, statt bei jeder Änderung einen neuen anzulegen.
 */
export interface DueDateSyncParams {
  /** `eventId` des zuvor angelegten Termins, oder `null`, wenn noch keiner existiert. */
  eventId: string | null;
  title: string;
  dueDate: string | null;
  dueTime: string;
  noteId: string | null;
  completed?: boolean;
}

/** Legt bei erstem Fälligkeitsdatum einen Termin an oder aktualisiert den bestehenden; entfernt ihn, wenn das Datum gelöscht wird. */
export async function syncDueDate({ eventId, title, dueDate, dueTime, noteId, completed }: DueDateSyncParams): Promise<string | null> {
  if (!dueDate) {
    if (eventId) await deleteEvent(eventId);
    return null;
  }
  const patch = { title: title.trim() || 'Ohne Titel', date: dueDate, time: dueTime, noteId, ...(completed !== undefined ? { completed } : {}) };
  if (eventId) {
    const updated = await updateEvent(eventId, patch);
    // Termin wurde extern gelöscht (z. B. im Kalender) – neu anlegen, damit die Verknüpfung nicht verwaist.
    if (updated) return eventId;
  }
  const created = await createEvent(patch);
  return created.id;
}

/** Entfernt die Verknüpfung: löscht den Termin, falls vorhanden. */
export async function clearDueDate(eventId: string | null): Promise<void> {
  if (eventId) await deleteEvent(eventId);
}

/** Spiegelt den Erledigt-Status einer Aufgabe/Karte auf ihren verknüpften Termin, ohne sonst etwas zu ändern. */
export async function syncCompleted(eventId: string | null, completed: boolean): Promise<void> {
  if (eventId) await updateEvent(eventId, { completed });
}
