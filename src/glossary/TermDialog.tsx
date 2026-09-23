import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TagChip } from '@/ui/TagChip';
import { useTags } from '@/hooks/useTags';
import { confirmDialog } from '@/ui/Dialog';
import { OPEN_TERM_EVENT, createTerm, deleteTerm, findTerm, getTerms, updateTerm, type OpenTermDetail } from './store';

interface Draft {
  id?: string;
  term: string;
  expansion: string;
  definition: string;
  tags: string[];
}

/** Einmal im Layout einbinden: Dialog zum Anlegen/Bearbeiten eines Glossar-Begriffs. */
export function TermDialogHost() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const tags = useTags();
  const termRef = useRef<HTMLInputElement>(null);
  const expRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<OpenTermDetail>).detail;
      // Gibt es den Begriff schon, wird er bearbeitet statt doppelt angelegt.
      const existing = d.id ? getTerms().find((t) => t.id === d.id) : d.term ? findTerm(d.term) : undefined;
      if (existing) setDraft({ id: existing.id, term: existing.term, expansion: existing.expansion || d.expansion || '', definition: existing.definition, tags: existing.tags });
      else setDraft({ term: d.term ?? '', expansion: d.expansion ?? '', definition: '', tags: [] });
    };
    window.addEventListener(OPEN_TERM_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TERM_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!draft) return;
    const prev = document.activeElement as HTMLElement | null;
    // Begriff schon da (aus der Markierung) → gleich bei der Langform weiterschreiben.
    requestAnimationFrame(() => (draft.term && !draft.id ? expRef.current : termRef.current)?.focus());
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

  const duplicate = draft && draft.term.trim() ? findTerm(draft.term) : undefined;
  const clash = !!duplicate && duplicate.id !== draft?.id;

  async function save() {
    if (!draft || !draft.term.trim() || clash) return;
    const patch = { term: draft.term.trim(), expansion: draft.expansion.trim(), definition: draft.definition.trim(), tags: draft.tags };
    if (draft.id) await updateTerm(draft.id, patch);
    else await createTerm(patch);
    setDraft(null);
  }

  async function remove() {
    if (!draft?.id) return;
    if (!(await confirmDialog(`„${draft.term}“ aus dem Glossar löschen?`, { confirmLabel: 'Löschen', danger: true }))) return;
    await deleteTerm(draft.id);
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
            aria-label={draft.id ? 'Begriff bearbeiten' : 'Neuer Begriff'}
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
            <h2>{draft.id ? 'Begriff bearbeiten' : 'Neuer Begriff'}</h2>
            <label className="gl-field">
              <span>Begriff oder Abkürzung</span>
              <input ref={termRef} value={draft.term} placeholder="z. B. DNS" onChange={(e) => setDraft({ ...draft, term: e.target.value })} />
              {clash && <em className="gl-field-warn">Gibt es schon – „{duplicate!.term}“ im Glossar bearbeiten.</em>}
            </label>
            <label className="gl-field">
              <span>Ausgeschrieben</span>
              <input ref={expRef} value={draft.expansion} placeholder="z. B. Domain Name System" onChange={(e) => setDraft({ ...draft, expansion: e.target.value })} />
            </label>
            <label className="gl-field">
              <span>Erklärung (optional)</span>
              <textarea rows={3} value={draft.definition} placeholder="Übersetzt Domainnamen in IP-Adressen …" onChange={(e) => setDraft({ ...draft, definition: e.target.value })} />
            </label>
            {tags && tags.length > 0 && (
              <div className="gl-field">
                <span>Fächer</span>
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
              {draft.id && (
                <button type="button" className="b-btn gl-dialog-delete" onClick={() => void remove()}>
                  Löschen
                </button>
              )}
              <button type="button" className="b-btn" onClick={() => setDraft(null)}>
                Abbrechen
              </button>
              <button type="submit" className="b-btn b-btn-primary" disabled={!draft.term.trim() || clash}>
                {draft.id ? 'Sichern' : 'Anlegen'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
