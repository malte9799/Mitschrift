import { useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { useNotes } from '@/hooks/useNotes';
import { noteHref, navigateTo } from '@/app/noteLinks';
import { syncDueDate, clearDueDate } from '@/editor/taskDueDate';
import { Popover } from '../collection/Popover';
import { moveCard, newCardId, newColumn, reorderColumn, type KanbanCard, type KanbanData } from './model';

/** „Fr., 02. Okt.“ – kurz genug für ein Karten-Badge. */
function formatDue(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`);
  const day = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
  return time ? `${day}, ${time}` : day;
}

export function KanbanView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const notes = useNotes();
  const data = node.attrs.data as KanbanData;
  const noteId = editor.storage.noteLink.currentId;

  const [editingCard, setEditingCard] = useState<{ colId: string; cardId: string; anchor: HTMLElement } | null>(null);
  const dragCard = useRef<{ cardId: string; fromColId: string } | null>(null);
  const [cardDragOver, setCardDragOver] = useState<{ colId: string; index: number } | null>(null);
  const dragCol = useRef<number | null>(null);
  const [colDragOver, setColDragOver] = useState<number | null>(null);

  const setData = (next: KanbanData) => updateAttributes({ data: next });

  function addColumn() {
    setData({ columns: [...data.columns, newColumn('Neue Spalte')] });
  }

  function renameColumn(colId: string, name: string) {
    setData({ columns: data.columns.map((c) => (c.id === colId ? { ...c, name } : c)) });
  }

  async function removeColumn(colId: string) {
    const col = data.columns.find((c) => c.id === colId);
    if (col) for (const card of col.cards) await clearDueDate(card.eventId ?? null);
    setData({ columns: data.columns.filter((c) => c.id !== colId) });
  }

  function addCard(colId: string) {
    const card: KanbanCard = { id: newCardId(), text: '' };
    setData({ columns: data.columns.map((c) => (c.id === colId ? { ...c, cards: [...c.cards, card] } : c)) });
  }

  async function removeCard(colId: string, cardId: string) {
    const col = data.columns.find((c) => c.id === colId);
    const card = col?.cards.find((c) => c.id === cardId);
    if (card) await clearDueDate(card.eventId ?? null);
    setData({ columns: data.columns.map((c) => (c.id === colId ? { ...c, cards: c.cards.filter((x) => x.id !== cardId) } : c)) });
  }

  function patchCard(colId: string, cardId: string, patch: Partial<KanbanCard>) {
    setData({
      columns: data.columns.map((c) => (c.id === colId ? { ...c, cards: c.cards.map((x) => (x.id === cardId ? { ...x, ...patch } : x)) } : c)),
    });
  }

  async function setCardDue(colId: string, card: KanbanCard, nextDate: string | null, nextTime: string) {
    const nextEventId = await syncDueDate({
      eventId: card.eventId ?? null,
      title: card.text,
      dueDate: nextDate,
      dueTime: nextTime,
      noteId,
    });
    patchCard(colId, card.id, { dueDate: nextDate, dueTime: nextTime, eventId: nextEventId });
  }

  function onCardDrop(toColId: string, toIndex: number) {
    const from = dragCard.current;
    dragCard.current = null;
    setCardDragOver(null);
    if (!from) return;
    setData(moveCard(data, from.cardId, toColId, toIndex));
  }

  function onColDrop(toIndex: number) {
    const from = dragCol.current;
    dragCol.current = null;
    setColDragOver(null);
    if (from === null) return;
    setData(reorderColumn(data, from, toIndex));
  }

  const editingCardData =
    editingCard && data.columns.find((c) => c.id === editingCard.colId)?.cards.find((c) => c.id === editingCard.cardId);

  return (
    <NodeViewWrapper className="b-kanban" data-interactive="">
      {bar.render(
        <BarButton icon="plus" label="Spalte hinzufügen" text="Spalte" onClick={addColumn} />,
      )}
      <div className="b-kanban-board">
        {data.columns.map((col, colIndex) => (
          <div
            key={col.id}
            className={`b-kanban-col${colDragOver === colIndex ? ' is-col-drag-over' : ''}`}
            onDragOver={(e) => {
              if (dragCol.current === null) return;
              e.preventDefault();
              setColDragOver(colIndex);
            }}
            onDrop={(e) => {
              if (dragCol.current === null) return;
              e.preventDefault();
              onColDrop(colIndex);
            }}
          >
            <div className="b-kanban-col-head" draggable={editable} onDragStart={() => (dragCol.current = colIndex)} onDragEnd={() => (dragCol.current = null)}>
              {editable ? (
                <input
                  className="b-kanban-col-name"
                  value={col.name}
                  placeholder="Spaltenname"
                  onChange={(e) => renameColumn(col.id, e.target.value)}
                />
              ) : (
                <span className="b-kanban-col-name">{col.name}</span>
              )}
              <span className="b-kanban-col-count">{col.cards.length}</span>
              {editable && (
                <button type="button" className="b-kanban-col-del" title="Spalte löschen" onClick={() => void removeColumn(col.id)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>

            <div
              className="b-kanban-cards"
              onDragOver={(e) => {
                if (!dragCard.current) return;
                e.preventDefault();
                setCardDragOver({ colId: col.id, index: col.cards.length });
              }}
              onDrop={(e) => {
                if (!dragCard.current) return;
                e.preventDefault();
                onCardDrop(col.id, col.cards.length);
              }}
            >
              {col.cards.map((card, i) => (
                <div
                  key={card.id}
                  className={`b-kanban-card${cardDragOver?.colId === col.id && cardDragOver.index === i ? ' is-drag-over' : ''}`}
                  draggable={editable}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    dragCard.current = { cardId: card.id, fromColId: col.id };
                  }}
                  onDragEnter={(e) => {
                    if (!dragCard.current) return;
                    e.stopPropagation();
                    setCardDragOver({ colId: col.id, index: i });
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (!dragCard.current) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onCardDrop(col.id, i);
                  }}
                  onDragEnd={() => {
                    dragCard.current = null;
                    setCardDragOver(null);
                  }}
                >
                  {editable ? (
                    <textarea
                      className="b-kanban-card-text"
                      value={card.text}
                      placeholder="Karte …"
                      rows={1}
                      onChange={(e) => patchCard(col.id, card.id, { text: e.target.value })}
                    />
                  ) : (
                    <p className="b-kanban-card-text">{card.text || 'Ohne Titel'}</p>
                  )}

                  {(card.noteId || card.dueDate) && (
                    <div className="b-kanban-card-meta">
                      {card.noteId && (
                        <button
                          type="button"
                          className="b-kanban-card-note"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateTo(noteHref(card.noteId!));
                          }}
                        >
                          <Icon name="note" /> {notes?.find((n) => n.id === card.noteId)?.title || 'Notiz'}
                        </button>
                      )}
                      {card.dueDate && (
                        <span className="b-kanban-card-due">
                          <Icon name="calendar" /> {formatDue(card.dueDate, card.dueTime ?? '')}
                        </span>
                      )}
                    </div>
                  )}

                  {editable && (
                    <div className="b-kanban-card-actions">
                      <button
                        type="button"
                        title="Details"
                        onClick={(e) => setEditingCard({ colId: col.id, cardId: card.id, anchor: e.currentTarget })}
                      >
                        <Icon name="more" />
                      </button>
                      <button type="button" className="is-danger" title="Karte löschen" onClick={() => void removeCard(col.id, card.id)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {editable && (
                <button type="button" className="b-kanban-add-card" onClick={() => addCard(col.id)}>
                  <Icon name="plus" /> Karte
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingCard && editingCardData && (
        <Popover anchor={editingCard.anchor} onClose={() => setEditingCard(null)} className="b-kanban-card-pop">
          <p className="b-pop-label">Mit Notiz verknüpfen</p>
          <select
            value={editingCardData.noteId ?? ''}
            onChange={(e) => patchCard(editingCard.colId, editingCard.cardId, { noteId: e.target.value || null })}
          >
            <option value="">Keine</option>
            {(notes ?? []).map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || 'Ohne Titel'}
              </option>
            ))}
          </select>
          <p className="b-pop-label">Fälligkeitsdatum</p>
          <input
            type="date"
            value={editingCardData.dueDate ?? ''}
            onChange={(e) => void setCardDue(editingCard.colId, editingCardData, e.target.value || null, editingCardData.dueTime ?? '')}
          />
          <input
            type="time"
            value={editingCardData.dueTime ?? ''}
            disabled={!editingCardData.dueDate}
            onChange={(e) => void setCardDue(editingCard.colId, editingCardData, editingCardData.dueDate ?? null, e.target.value)}
          />
          {editingCardData.dueDate && (
            <button
              type="button"
              className="b-pop-remove"
              onClick={() => void setCardDue(editingCard.colId, editingCardData, null, '')}
            >
              Datum entfernen
            </button>
          )}
        </Popover>
      )}
    </NodeViewWrapper>
  );
}
