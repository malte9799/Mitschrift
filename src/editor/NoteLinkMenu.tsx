import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Icon } from '@/ui/Icon';
import type { Note } from '@/storage';

export type NoteLinkChoice =
  | { kind: 'note'; note: Note }
  /** Neue Notiz anlegen und verlinken; `child` = als Unterseite der aktuellen Notiz. */
  | { kind: 'create'; title: string; child: boolean };

export interface NoteLinkMenuHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

interface NoteLinkMenuProps {
  items: NoteLinkChoice[];
  query: string;
  onSelect: (choice: NoteLinkChoice) => void;
}

/** Auswahl beim Tippen von „[[“: vorhandene Notizen oder neue anlegen. */
export const NoteLinkMenu = forwardRef<NoteLinkMenuHandle, NoteLinkMenuProps>(function NoteLinkMenu({ items, query, onSelect }, ref) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [items]);

  useEffect(() => {
    listRef.current?.querySelector('button.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown(e) {
      if (e.key === 'ArrowDown') {
        setActive((i) => Math.min(i + 1, items.length - 1));
        return true;
      }
      if (e.key === 'ArrowUp') {
        setActive((i) => Math.max(i - 1, 0));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const item = items[active];
        if (!item) return false;
        onSelect(item);
        return true;
      }
      return false;
    },
  }));

  const notes = items.filter((i) => i.kind === 'note');
  const creates = items.filter((i) => i.kind === 'create');

  if (items.length === 0) {
    return (
      <div className="c-insert-menu">
        <p className="c-insert-menu-empty">{query.trim() ? `Keine Notiz „${query.trim()}“` : 'Noch keine anderen Notizen.'}</p>
      </div>
    );
  }

  const button = (item: NoteLinkChoice, index: number, icon: 'file' | 'plus', label: React.ReactNode) => (
    <button
      key={item.kind === 'note' ? item.note.id : `new-${item.child}`}
      type="button"
      className={index === active ? 'active' : ''}
      onMouseEnter={() => setActive(index)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(item)}
    >
      <Icon name={icon} />
      <span className="c-note-link-label">{label}</span>
    </button>
  );

  return (
    <div className="c-insert-menu c-note-link-menu" ref={listRef}>
      {notes.length > 0 && (
        <div className="c-insert-menu-group">
          <span className="c-insert-menu-label">Notiz verlinken</span>
          {notes.map((item, i) => button(item, i, 'file', item.kind === 'note' && (item.note.title || 'Ohne Titel')))}
        </div>
      )}
      {creates.length > 0 && (
        <div className="c-insert-menu-group">
          <span className="c-insert-menu-label">Neu anlegen</span>
          {creates.map((item, i) =>
            button(
              item,
              notes.length + i,
              'plus',
              item.kind === 'create' && (
                <>
                  „{item.title}“ <em>{item.child ? 'als Unterseite' : 'als Notiz'}</em>
                </>
              ),
            ),
          )}
        </div>
      )}
    </div>
  );
});
