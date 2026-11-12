import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Tag, TagColor } from '@/storage';
import { Icon } from '@/ui/Icon';
import { createTag, deleteTag, mergeTag, tagColors, updateTag } from './actions';
import { confirmDialog } from '@/ui/Dialog';

interface TagPickerProps {
  tags: Tag[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

/** Fokus im Suchfeld lassen, damit man direkt weitertippen kann. */
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/** Nächste Farbe, die noch kein Tag hat – damit neue Tags unterscheidbar bleiben. */
function nextColor(tags: Tag[]): TagColor {
  const used = new Set(tags.map((t) => t.color));
  return tagColors.find((c) => !used.has(c.value))?.value ?? tagColors[tags.length % tagColors.length].value;
}

/** Popover: Tags suchen, an-/abwählen, neu anlegen und bearbeiten (Name, Farbe, Löschen). */
export function TagPicker({ tags, selected, onToggle, onClose }: TagPickerProps) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    inputRef.current?.focus();
    function onDown(e: MouseEvent) {
      // Klicks auf den Öffnen-Button (im selben Wrapper) schaltet der Button selbst um.
      const wrap = rootRef.current?.parentElement;
      if (wrap && !wrap.contains(e.target as Node)) closeRef.current();
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const q = query.trim();
  const filtered = useMemo(() => tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())), [tags, q]);
  const exact = tags.some((t) => t.name.toLowerCase() === q.toLowerCase());
  const canCreate = q.length > 0 && !exact;
  const count = filtered.length + (canCreate ? 1 : 0);

  async function create() {
    const tag = await createTag(q, nextColor(tags));
    onToggle(tag.id);
    setQuery('');
  }

  function choose(i: number) {
    if (i < filtered.length) onToggle(filtered[i].id);
    else if (canCreate) void create();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (count ? (c + 1) % count : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (count ? (c - 1 + count) % count : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(Math.min(cursor, count - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <motion.div
      ref={rootRef}
      className="tag-picker"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.14 }}
    >
      <input
        ref={inputRef}
        className="tag-picker-input"
        value={query}
        placeholder="Tag suchen oder anlegen …"
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul className="tag-picker-list" role="listbox" aria-label="Tags">
        {filtered.map((t, i) =>
          editing === t.id ? (
            <TagEditor key={t.id} tag={t} tags={tags} onDone={() => setEditing(null)} />
          ) : (
            <li key={t.id} className={`tag-picker-row${i === cursor ? ' is-cursor' : ''}`} data-color={t.color}>
              <button type="button" role="option" aria-selected={selected.includes(t.id)} className="tag-picker-option" onMouseDown={keepFocus} onClick={() => onToggle(t.id)} onMouseEnter={() => setCursor(i)}>
                <span className="tag-dot" aria-hidden="true" />
                <span className="tag-picker-name">{t.name}</span>
                {selected.includes(t.id) && <Icon name="check" className="tag-picker-check" />}
              </button>
              <button type="button" className="tag-picker-edit" aria-label={`${t.name} bearbeiten`} onClick={() => setEditing(t.id)}>
                <Icon name="pencil" />
              </button>
              <button
                type="button"
                className="tag-picker-edit"
                aria-label={`${t.name} löschen`}
                title="Tag löschen"
                onClick={async () => {
                  if (!(await confirmDialog(`Tag „${t.name}“ löschen? Es wird aus allen Notizen entfernt.`, { confirmLabel: 'Löschen', danger: true }))) return;
                  await deleteTag(t.id);
                }}
              >
                <Icon name="trash" />
              </button>
            </li>
          ),
        )}
        {canCreate && (
          <li className={`tag-picker-row${cursor === filtered.length ? ' is-cursor' : ''}`}>
            <button type="button" className="tag-picker-option" onMouseDown={keepFocus} onClick={create} onMouseEnter={() => setCursor(filtered.length)}>
              <Icon name="plus" className="tag-picker-plus" />
              <span className="tag-picker-name">
                „{q}“ anlegen
              </span>
            </button>
          </li>
        )}
        {!canCreate && filtered.length === 0 && <li className="tag-picker-empty">Noch keine Tags – Namen eintippen und Enter.</li>}
      </ul>
    </motion.div>
  );
}

function TagEditor({ tag, tags, onDone }: { tag: Tag; tags: Tag[]; onDone: () => void }) {
  const [name, setName] = useState(tag.name);

  async function save() {
    const n = name.trim();
    if (!n || n === tag.name) return onDone();
    // Gleicher Name wie ein anderes Tag? Dann zusammenführen statt Doppeltag zu erzeugen.
    const other = tags.find((t) => t.id !== tag.id && t.name.trim().toLowerCase() === n.toLowerCase());
    if (other) {
      if (
        await confirmDialog(
          `„${tag.name}“ und „${other.name}“ zusammenführen? Alle Notizen mit „${tag.name}“ bekommen danach „${other.name}“.`,
          { confirmLabel: 'Zusammenführen' },
        )
      ) {
        await mergeTag(tag.id, other.id);
      }
    } else {
      await updateTag(tag.id, { name: n });
    }
    onDone();
  }

  return (
    <li className="tag-editor" data-color={tag.color}>
      <input
        autoFocus
        value={name}
        aria-label="Name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            e.stopPropagation();
            onDone();
          }
        }}
      />
      <div className="tag-editor-colors" role="radiogroup" aria-label="Farbe">
        {tagColors.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={c.value === tag.color}
            aria-label={c.label}
            title={c.label}
            data-color={c.value}
            className={`tag-swatch${c.value === tag.color ? ' active' : ''}`}
            onClick={() => updateTag(tag.id, { color: c.value })}
          />
        ))}
      </div>
      <div className="tag-editor-actions">
        <button
          type="button"
          className="tag-editor-delete"
          onClick={async () => {
            if (!(await confirmDialog(`Tag „${tag.name}“ löschen? Es wird aus allen Notizen entfernt.`, { confirmLabel: 'Löschen', danger: true }))) return;
            await deleteTag(tag.id);
            onDone();
          }}
        >
          <Icon name="trash" /> Löschen
        </button>
        <button type="button" className="tag-editor-done" onClick={save}>
          <Icon name="check" /> Fertig
        </button>
      </div>
    </li>
  );
}
