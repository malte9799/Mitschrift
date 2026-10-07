export interface KanbanCard {
  id: string;
  text: string;
  /** Optional mit einer Notiz verknüpft. */
  noteId?: string | null;
  /** „YYYY-MM-DD“, wie CalendarEvent.date; wiederverwendet denselben Fälligkeits-Sync wie Aufgabenzeilen. */
  dueDate?: string | null;
  dueTime?: string;
  /** Verknüpfter Kalendertermin (siehe taskDueDate.ts), damit Änderungen denselben Termin treffen. */
  eventId?: string | null;
}

export interface KanbanColumn {
  id: string;
  name: string;
  cards: KanbanCard[];
}

export interface KanbanData {
  columns: KanbanColumn[];
}

let seq = 0;
/** Eindeutige, aber kurze ID – reicht innerhalb eines Boards. */
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export const newCardId = () => newId('c');
export const newColumnId = () => newId('col');

/** Beispiel-Board für einen neu eingefügten Block. */
export function sampleKanban(): KanbanData {
  return {
    columns: [
      { id: newColumnId(), name: 'Offen', cards: [{ id: newCardId(), text: 'Erste Karte' }] },
      { id: newColumnId(), name: 'In Arbeit', cards: [] },
      { id: newColumnId(), name: 'Fertig', cards: [] },
    ],
  };
}

export function newColumn(name: string): KanbanColumn {
  return { id: newColumnId(), name, cards: [] };
}

/** Verschiebt eine Karte in eine (andere oder dieselbe) Spalte an eine bestimmte Position. */
export function moveCard(data: KanbanData, cardId: string, toColId: string, toIndex: number): KanbanData {
  let card: KanbanCard | null = null;
  const withoutCard = data.columns.map((col) => {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return col;
    card = col.cards[idx];
    return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
  });
  if (!card) return data;
  return {
    columns: withoutCard.map((col) => {
      if (col.id !== toColId) return col;
      const cards = [...col.cards];
      cards.splice(Math.max(0, Math.min(toIndex, cards.length)), 0, card as KanbanCard);
      return { ...col, cards };
    }),
  };
}

/** Verschiebt eine Spalte an eine andere Position. */
export function reorderColumn(data: KanbanData, fromIndex: number, toIndex: number): KanbanData {
  if (fromIndex === toIndex) return data;
  const columns = [...data.columns];
  const [col] = columns.splice(fromIndex, 1);
  columns.splice(Math.max(0, Math.min(toIndex, columns.length)), 0, col);
  return { columns };
}
