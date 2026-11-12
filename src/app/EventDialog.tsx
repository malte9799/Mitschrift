import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TagChip } from '@/ui/TagChip';
import { useTags } from '@/hooks/useTags';
import { useNotes } from '@/hooks/useNotes';
import { confirmDialog } from '@/ui/Dialog';
import type { CalendarSource } from '@/storage';
import { OPEN_EVENT_EVENT, createEvent, deleteEvent, getEvents, updateEvent, type OpenEventDetail } from './eventStore';

const SOURCE_LABEL: Record<CalendarSource, string> = { manual: 'Termin', untis: 'Untis', itslearning: 'itslearning' };

interface Draft {
  id?: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  notes: string;
  noteId: string | null;
  tags: string[];
  source: CalendarSource;
  completed: boolean;
}

const todayISO = () => new Date().toLocaleDateString('sv-SE'); // sv-SE liefert YYYY-MM-DD

/** Einmal im Layout einbinden: Dialog zum Anlegen/Bearbeiten eines Kalendertermins. */
export function EventDialogHost() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const tags = useTags();
  const notes = useNotes();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<OpenEventDetail>).detail;
      const existing = d.id ? getEvents().find((ev) => ev.id === d.id) : undefined;
      if (existing)
        setDraft({
          id: existing.id,
          title: existing.title,
          date: existing.date,
          time: existing.time,
          endTime: existing.endTime,
          notes: existing.notes,
          noteId: existing.noteId,
          tags: existing.tags,
          source: existing.source,
          completed: existing.completed,
        });
      else setDraft({ title: '', date: d.date ?? todayISO(), time: '', endTime: '', notes: '', noteId: null, tags: [], source: 'manual', completed: false });
    };
    window.addEventListener(OPEN_EVENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!draft) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => titleRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setDraft(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, [!!draft]);

  const readOnly = draft?.source && draft.source !== 'manual';

  async function save() {
    if (!draft || readOnly || !draft.title.trim() || !draft.date) return;
    const patch = {
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time,
      notes: draft.notes.trim(),
      noteId: draft.noteId,
      tags: draft.tags,
      completed: draft.completed,
    };
    if (draft.id) await updateEvent(draft.id, patch);
    else await createEvent(patch);
    setDraft(null);
  }

  async function remove() {
    if (!draft?.id || readOnly) return;
    if (!(await confirmDialog(`„${draft.title}“ löschen?`, { confirmLabel: 'Löschen', danger: true }))) return;
    await deleteEvent(draft.id);
    setDraft(null);
  }

  return (
    <AnimatePresence>
      {draft && (
        <motion.div className="dialog-backdrop" onMouseDown={() => setDraft(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form
            className="dialog gl-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={draft.id ? 'Termin bearbeiten' : 'Neuer Termin'}
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
          >
            <h2>{draft.id ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
            {readOnly && (
              <p className="cal-dialog-readonly">
                Aus {SOURCE_LABEL[draft.source]} synchronisiert – wird beim nächsten Abgleich automatisch aktualisiert und lässt sich hier nicht bearbeiten.
              </p>
            )}
            <label className="gl-field">
              <span>Titel</span>
              <input ref={titleRef} value={draft.title} placeholder="z. B. Mathe-Klausur" readOnly={readOnly} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            {draft.id && (
              <label className="cal-dialog-completed">
                <input
                  type="checkbox"
                  checked={draft.completed}
                  disabled={!!readOnly}
                  onChange={(e) => setDraft({ ...draft, completed: e.target.checked })}
                />
                <span>Erledigt</span>
              </label>
            )}
            <div className="cal-dialog-row">
              <label className="gl-field">
                <span>Datum</span>
                <input type="date" value={draft.date} readOnly={readOnly} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <label className="gl-field">
                <span>Uhrzeit (optional)</span>
                <input
                  type="time"
                  value={draft.time}
                  readOnly={readOnly}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                />
              </label>
            </div>
            <label className="gl-field">
              <span>Notiz (optional)</span>
              <textarea rows={3} value={draft.notes} placeholder="Details zum Termin …" readOnly={readOnly} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
            {notes && notes.length > 0 && !readOnly && (
              <label className="gl-field">
                <span>Verknüpfte Notiz (optional)</span>
                <select value={draft.noteId ?? ''} onChange={(e) => setDraft({ ...draft, noteId: e.target.value || null })}>
                  <option value="">Keine</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || 'Ohne Titel'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {tags && tags.length > 0 && !readOnly && (
              <div className="gl-field">
                <span>Tags</span>
                <div className="gl-dialog-tags">
                  {tags.map((t) => (
                    <TagChip
                      key={t.id}
                      tag={t}
                      active={draft.tags.includes(t.id)}
                      onClick={() => setDraft({ ...draft, tags: draft.tags.includes(t.id) ? draft.tags.filter((x) => x !== t.id) : [...draft.tags, t.id] })}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="dialog-actions">
              {draft.id && !readOnly && (
                <button type="button" className="b-btn gl-dialog-delete" onClick={() => void remove()}>
                  Löschen
                </button>
              )}
              <button type="button" className="b-btn" onClick={() => setDraft(null)}>
                {readOnly ? 'Schließen' : 'Abbrechen'}
              </button>
              {!readOnly && (
                <button type="submit" className="b-btn b-btn-primary" disabled={!draft.title.trim() || !draft.date}>
                  {draft.id ? 'Sichern' : 'Anlegen'}
                </button>
              )}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
