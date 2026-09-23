import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { sideNoteTagColor } from './model';

interface Props {
  anchor: HTMLElement;
  /** Labels dieser Notiz. */
  selected: string[];
  /** Vorschläge: Vorlagen und Labels, die schon an anderen Randnotizen hängen. */
  suggestions: string[];
  onToggle: (name: string) => void;
  onClose: () => void;
  align: 'start' | 'end';
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Label suchen, an-/abwählen oder neu eintippen – Enter übernimmt die markierte Zeile. */
export function SideNoteTagPicker({ anchor, selected, suggestions, onToggle, onClose, align }: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);

  const q = query.trim();
  const options = suggestions.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.length > 0 && !suggestions.some((t) => same(t, q));
  const count = options.length + (canCreate ? 1 : 0);

  function choose(i: number) {
    if (i < options.length) onToggle(options[i]);
    else if (canCreate) onToggle(q);
    setQuery('');
    setCursor(0);
  }

  return (
    <Popover anchor={anchor} onClose={onClose} align={align} className="c-side-note-tagpop">
      <input
        ref={inputRef}
        className="tag-picker-input"
        value={query}
        placeholder="Label suchen oder anlegen …"
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const d = e.key === 'ArrowDown' ? 1 : -1;
            setCursor((c) => (count ? (c + d + count) % count : 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (count) choose(Math.min(cursor, count - 1));
          } else if (e.key === 'Backspace' && !query && selected.length) {
            // Wie in Tag-Feldern üblich: Backspace im leeren Feld nimmt das letzte Label ab.
            onToggle(selected[selected.length - 1]);
          }
        }}
      />
      <ul className="tag-picker-list" role="listbox" aria-label="Labels">
        {options.map((t, i) => {
          const on = selected.some((s) => same(s, t));
          return (
            <li key={t} className={`tag-picker-row${i === cursor ? ' is-cursor' : ''}`} data-color={sideNoteTagColor(t)}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                className="tag-picker-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="tag-dot" aria-hidden="true" />
                <span className="tag-picker-name">{t}</span>
                {on && <Icon name="check" className="tag-picker-check" />}
              </button>
            </li>
          );
        })}
        {canCreate && (
          <li className={`tag-picker-row${cursor === options.length ? ' is-cursor' : ''}`}>
            <button
              type="button"
              className="tag-picker-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(options.length)}
              onMouseEnter={() => setCursor(options.length)}
            >
              <Icon name="plus" className="tag-picker-plus" />
              <span className="tag-picker-name">„{q}“ anlegen</span>
            </button>
          </li>
        )}
      </ul>
    </Popover>
  );
}
