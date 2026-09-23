import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTags } from '@/hooks/useTags';
import { Icon } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { TagPicker } from './TagPicker';

interface NoteTagsProps {
  value: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

/** Tag-Zeile unter dem Notiztitel: gewählte Fächer + Button zum Hinzufügen. */
export function NoteTags({ value, onChange, readOnly }: NoteTagsProps) {
  const tags = useTags();
  const [open, setOpen] = useState(false);
  if (!tags) return null;

  // Reihenfolge wie in der Tag-Liste; gelöschte Tags fallen automatisch weg.
  const chosen = tags.filter((t) => value.includes(t.id));
  if (readOnly && chosen.length === 0) return null;

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);

  return (
    <div className="note-tags">
      {chosen.map((t) => (
        <TagChip key={t.id} tag={t} onRemove={readOnly ? undefined : () => toggle(t.id)} />
      ))}
      {!readOnly && (
        <div className="note-tags-add-wrap">
          <button type="button" className={`note-tags-add${open ? ' active' : ''}`} onClick={() => setOpen((o) => !o)}>
            <Icon name="plus" />
            {chosen.length === 0 && <span>Fach</span>}
          </button>
          <AnimatePresence>{open && <TagPicker tags={tags} selected={value} onToggle={toggle} onClose={() => setOpen(false)} />}</AnimatePresence>
        </div>
      )}
    </div>
  );
}
