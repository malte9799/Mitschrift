import { useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { syncCompleted, syncDueDate } from './taskDueDate';

/** „Mo., 13. Okt.“ – kurz genug für ein Badge neben dem Aufgabentext. */
function formatDue(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`);
  const day = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
  return time ? `${day}, ${time}` : day;
}

export function TaskDueItemView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const editable = editor.isEditable;
  const checked = !!node.attrs.checked;
  const dueDate = node.attrs.dueDate as string | null;
  const dueTime = (node.attrs.dueTime as string) || '';
  const eventId = node.attrs.eventId as string | null;

  function toggleChecked() {
    const next = !checked;
    updateAttributes({ checked: next });
    void syncCompleted(eventId, next);
  }

  async function applyDue(nextDate: string | null, nextTime: string) {
    const noteId = editor.storage.noteLink.currentId;
    const nextEventId = await syncDueDate({
      eventId,
      title: node.textContent,
      dueDate: nextDate,
      dueTime: nextTime,
      noteId,
      completed: checked,
    });
    updateAttributes({ dueDate: nextDate, dueTime: nextTime, eventId: nextEventId });
  }

  return (
    <NodeViewWrapper as="li" className={`b-task-due${checked ? ' is-checked' : ''}`} data-checked={checked}>
      <label contentEditable={false}>
        <input type="checkbox" checked={checked} onChange={toggleChecked} disabled={!editable} />
        <span />
      </label>
      <div className="b-task-due-body">
        <NodeViewContent as="div" />
        {editable ? (
          <button
            type="button"
            ref={badgeRef}
            className={`b-task-due-badge${dueDate ? ' is-set' : ''}`}
            contentEditable={false}
            onClick={() => setPickerAnchor(badgeRef.current)}
          >
            <Icon name={dueDate ? 'calendar' : 'clock'} />
            {dueDate ? formatDue(dueDate, dueTime) : 'Fällig …'}
          </button>
        ) : (
          dueDate && (
            <span className="b-task-due-badge is-set is-readonly" contentEditable={false}>
              <Icon name="calendar" />
              {formatDue(dueDate, dueTime)}
            </span>
          )
        )}
      </div>
      {pickerAnchor && (
        <Popover anchor={pickerAnchor} onClose={() => setPickerAnchor(null)} className="b-task-due-pop">
          <label className="b-pop-label" htmlFor={`due-date-${getPos()}`}>
            Fälligkeitsdatum
          </label>
          <input
            id={`due-date-${getPos()}`}
            type="date"
            value={dueDate ?? ''}
            onChange={(e) => void applyDue(e.target.value || null, dueTime)}
          />
          <input type="time" value={dueTime} disabled={!dueDate} onChange={(e) => void applyDue(dueDate, e.target.value)} />
          {dueDate && (
            <button
              type="button"
              className="b-pop-remove"
              onClick={() => {
                void applyDue(null, '');
                setPickerAnchor(null);
              }}
            >
              Datum entfernen
            </button>
          )}
        </Popover>
      )}
    </NodeViewWrapper>
  );
}
