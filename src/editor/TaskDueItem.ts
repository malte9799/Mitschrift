import { TaskItem } from '@tiptap/extension-list';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TaskDueItemView } from './TaskDueItemView';

const str = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
  renderHTML: (a: Record<string, unknown>) => (a[name] ? { [`data-${name}`]: a[name] as string } : {}),
});

/**
 * Aufgabenzeile mit optionalem Fälligkeitsdatum. Ohne Datum verhält sie sich wie die normale
 * Aufgabenzeile (nur Checkbox); mit Datum entsteht automatisch ein verknüpfter Kalendertermin
 * (siehe {@link syncDueDate} in `taskDueDate.ts`), der beim Abhaken als erledigt markiert wird.
 * Deckt damit auch die „generische“ Aufgabenliste ab (Zeile mit Datum, aber ohne genutzte Checkbox –
 * z. B. „Klausur Freitag“).
 */
export const TaskDueItem = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // „YYYY-MM-DD“, wie CalendarEvent.date; null = kein Fälligkeitsdatum gesetzt.
      dueDate: str('due-date'),
      // „HH:MM“, oder leer für ganztägig.
      dueTime: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-due-time') ?? '',
        renderHTML: (a: Record<string, unknown>) => (a.dueTime ? { 'data-due-time': a.dueTime as string } : {}),
      },
      // Verknüpfter Kalendertermin, damit Änderungen denselben Termin treffen statt neue anzulegen.
      eventId: str('event-id'),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskDueItemView);
  },
});
