import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import type { Note, Term } from '@/storage';
import { textOf, type PMNode } from '@/export/model';
import { shuffle } from '@/blocks/jsonAttr';
import { buildMatcher, findSuggestions, parseImport } from '@/glossary/match';
import { createTerm, openTermDialog, updateTerm, useHighlight, setHighlight, useTerms } from '@/glossary/store';
import type { LayoutContext } from './AppLayout';
import { noteHref } from './noteLinks';

/** Reiner Text jeder Notiz (einmal je Notizstand). */
function useNoteTexts(notes: Note[] | null) {
  return useMemo(
    () =>
      (notes ?? []).map((n) => {
        let text = n.title;
        try {
          if (n.content) text += '\n' + textOf(JSON.parse(n.content) as PMNode);
        } catch {
          /* kaputter Inhalt – nur Titel */
        }
        return { noteId: n.id, title: n.title || 'Ohne Titel', text };
      }),
    [notes],
  );
}

const letterOf = (t: Term) => {
  const c = t.term.trim()[0]?.toLocaleUpperCase('de') ?? '#';
  return /\p{L}/u.test(c) ? c.normalize('NFD')[0] : '#';
};

type Panel = null | 'import' | 'suggest';

/** Glossar: alle Begriffe und Abkürzungen, mit Suche, Fach-Filter, Import, Vorschlägen und Abfrage. */
export function GlossaryPage() {
  const terms = useTerms();
  const tags = useTags();
  const notes = useNotes();
  const highlight = useHighlight();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [quiz, setQuiz] = useState(false);
  const focusId = params.get('t');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Glossar – Mitschrift';
  }, []);

  const texts = useNoteTexts(notes);

  // In welchen Notizen kommt ein Begriff vor?
  const usage = useMemo(() => {
    const map = new Map<string, { noteId: string; title: string }[]>();
    if (!terms) return map;
    const matcher = buildMatcher(terms);
    for (const t of texts) {
      for (const id of new Set(matcher.find(t.text).map((m) => m.term.id))) {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push({ noteId: t.noteId, title: t.title });
      }
    }
    return map;
  }, [terms, texts]);

  const suggestions = useMemo(() => (terms ? findSuggestions(texts, new Set(terms.map((t) => t.term))) : []), [terms, texts]);

  const q = query.trim().toLocaleLowerCase('de');
  const filtered = useMemo(
    () =>
      (terms ?? []).filter(
        (t) =>
          (!tagFilter || t.tags.includes(tagFilter)) &&
          (!q || t.term.toLocaleLowerCase('de').includes(q) || t.expansion.toLocaleLowerCase('de').includes(q) || t.definition.toLocaleLowerCase('de').includes(q)),
      ),
    [terms, tagFilter, q],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of filtered) {
      const l = letterOf(t);
      if (!map.has(l)) map.set(l, []);
      map.get(l)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b, 'de')));
  }, [filtered]);

  // Aus der Hover-Karte „Im Glossar“: Begriff anspringen und kurz hervorheben.
  useEffect(() => {
    if (!focusId || !terms) return;
    const el = listRef.current?.querySelector(`[data-id="${CSS.escape(focusId)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setParams({}, { replace: true }), 2400);
    return () => clearTimeout(t);
  }, [focusId, terms, setParams]);

  const tagById = new Map((tags ?? []).map((t) => [t.id, t]));

  return (
    <div className="gl-screen">
      <header className="note-bar graph-bar">
        <div className="note-bar-left">
          <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}>
            <Icon name="menu" />
          </button>
          <h1 className="graph-title">Glossar</h1>
          {terms && <span className="graph-stats">{terms.length} Begriffe</span>}
        </div>
      </header>

      <main className="gl-page">
        <div className="gl-toolbar">
          <label className="graph-search gl-search">
            <Icon name="search" />
            <input value={query} placeholder="Begriff, Langform oder Erklärung suchen …" onChange={(e) => setQuery(e.target.value)} autoFocus />
          </label>
          <button type="button" className="b-btn b-btn-primary" onClick={() => openTermDialog({ term: query.trim() })}>
            <Icon name="plus" /> Begriff
          </button>
          <button type="button" className={`b-btn${panel === 'import' ? ' is-on' : ''}`} onClick={() => setPanel(panel === 'import' ? null : 'import')}>
            <Icon name="upload" /> Importieren
          </button>
          <button type="button" className={`b-btn${panel === 'suggest' ? ' is-on' : ''}`} onClick={() => setPanel(panel === 'suggest' ? null : 'suggest')} disabled={!suggestions.length && panel !== 'suggest'}>
            <Icon name="sparkle" /> Vorschläge{suggestions.length > 0 && <span className="gl-count">{suggestions.length}</span>}
          </button>
          <button type="button" className="b-btn" onClick={() => setQuiz(true)} disabled={filtered.length < 2}>
            <Icon name="cards" /> Abfragen
          </button>
        </div>

        <div className="gl-filters">
          {tags && tags.length > 0 && (
            <div className="gl-tagfilter" role="group" aria-label="Nach Fach filtern">
              {tags.map((t) => (
                <TagChip key={t.id} tag={t} active={tagFilter === t.id} onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)} />
              ))}
            </div>
          )}
          <label className="gl-switch">
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
            In Notizen hervorheben
          </label>
        </div>

        <AnimatePresence initial={false}>
          {panel === 'import' && (
            <motion.div key="import" className="gl-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <ImportPanel existing={terms ?? []} tagFilter={tagFilter} onDone={() => setPanel(null)} />
            </motion.div>
          )}
          {panel === 'suggest' && (
            <motion.div key="suggest" className="gl-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <SuggestPanel suggestions={suggestions} notes={notes ?? []} tagFilter={tagFilter} />
            </motion.div>
          )}
        </AnimatePresence>

        {groups.length > 1 && (
          <nav className="gl-az" aria-label="Alphabet">
            {groups.map(([l]) => (
              <a key={l} href={`#gl-${l}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(`gl-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                {l}
              </a>
            ))}
          </nav>
        )}

        <div ref={listRef} className="gl-list">
          {terms && terms.length === 0 && (
            <div className="gl-empty">
              <Icon name="book" />
              <h2>Noch keine Begriffe</h2>
              <p>
                Markiere in einer Notiz eine Abkürzung – z. B. „Domain Name System (DNS)“ – und wähle in der Format-Leiste <strong>Als Begriff</strong>. Oder importiere eine ganze Liste.
              </p>
              <p>Begriffe werden danach in allen Notizen erkannt und beim Überfahren erklärt.</p>
            </div>
          )}
          {terms && terms.length > 0 && filtered.length === 0 && <p className="gl-none">Nichts gefunden.</p>}
          {groups.map(([letter, list]) => (
            <section key={letter} id={`gl-${letter}`} className="gl-group">
              <h2>{letter}</h2>
              {list.map((t) => {
                const used = usage.get(t.id) ?? [];
                return (
                  <article key={t.id} data-id={t.id} className={`gl-row${focusId === t.id ? ' is-focus' : ''}`} onClick={() => openTermDialog({ id: t.id })}>
                    <div className="gl-row-term">{t.term}</div>
                    <div className="gl-row-body">
                      <p className="gl-row-exp">{t.expansion || <em>ohne Langform</em>}</p>
                      {t.definition && <p className="gl-row-def">{t.definition}</p>}
                      <div className="gl-row-meta">
                        {t.tags.map((id) => tagById.get(id)).map((tag) => tag && <TagChip key={tag.id} tag={tag} />)}
                        {used.slice(0, 3).map((u) => (
                          <button
                            key={u.noteId}
                            type="button"
                            className="gl-row-note"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(noteHref(u.noteId));
                            }}
                          >
                            <Icon name="note" /> {u.title}
                          </button>
                        ))}
                        {used.length > 3 && <span className="gl-row-more">+{used.length - 3}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </main>

      <AnimatePresence>{quiz && <GlossaryQuiz terms={filtered} onClose={() => setQuiz(false)} />}</AnimatePresence>
    </div>
  );
}

function ImportPanel({ existing, tagFilter, onDone }: { existing: Term[]; tagFilter: string | null; onDone: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseImport(text), [text]);
  const known = new Map(existing.map((t) => [t.term, t]));
  const fresh = parsed.filter((p) => !known.has(p.term));
  const updates = parsed.filter((p) => {
    const t = known.get(p.term);
    return t && ((!t.expansion && p.expansion) || (!t.definition && p.definition));
  });

  async function run() {
    setBusy(true);
    const seen = new Set<string>();
    for (const p of fresh) {
      if (seen.has(p.term)) continue;
      seen.add(p.term);
      await createTerm({ ...p, tags: tagFilter ? [tagFilter] : [] });
    }
    // Vorhandene nur ergänzen, nie überschreiben.
    for (const p of updates) {
      const t = known.get(p.term)!;
      await updateTerm(t.id, { expansion: t.expansion || p.expansion, definition: t.definition || p.definition });
    }
    setBusy(false);
    setText('');
    onDone();
  }

  return (
    <div className="gl-import">
      <p>
        Eine Zeile pro Begriff, z. B. <code>DNS – Domain Name System</code>, <code>TCP: Transmission Control Protocol</code>, <code>Begriff;Langform;Erklärung</code> oder eine
        Markdown-Tabelle.
      </p>
      <textarea
        value={text}
        rows={6}
        spellCheck={false}
        placeholder={'DNS – Domain Name System\nDHCP – Dynamic Host Configuration Protocol\nVLAN; Virtual Local Area Network; Logisch getrenntes Netz im selben Switch'}
        onChange={(e) => setText(e.target.value)}
      />
      {parsed.length > 0 && (
        <ul className="gl-import-preview">
          {parsed.slice(0, 8).map((p, i) => (
            <li key={i} className={known.has(p.term) ? 'is-known' : ''}>
              <strong>{p.term}</strong> {p.expansion && <>– {p.expansion}</>}
              {known.has(p.term) && <em> (schon da)</em>}
            </li>
          ))}
          {parsed.length > 8 && <li className="is-more">… und {parsed.length - 8} weitere</li>}
        </ul>
      )}
      <div className="gl-import-actions">
        <span>{tagFilter ? 'Neue Begriffe bekommen das gewählte Fach.' : ''}</span>
        <button type="button" className="b-btn b-btn-primary" disabled={busy || (!fresh.length && !updates.length)} onClick={() => void run()}>
          {fresh.length} neu{updates.length ? ` · ${updates.length} ergänzen` : ''} – importieren
        </button>
      </div>
    </div>
  );
}

function SuggestPanel({ suggestions, notes, tagFilter }: { suggestions: { term: string; expansion: string; noteId: string }[]; notes: Note[]; tagFilter: string | null }) {
  const navigate = useNavigate();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const visible = suggestions.filter((s) => !skipped.has(s.term));
  const titleOf = (id: string) => notes.find((n) => n.id === id)?.title || 'Ohne Titel';

  if (!visible.length) return <p className="gl-import">Keine weiteren Vorschläge – alle Abkürzungen aus deinen Notizen sind im Glossar.</p>;

  return (
    <div className="gl-import">
      <p>In deinen Notizen stehen diese Abkürzungen mit Langform („Domain Name System (DNS)“). Übernehmen?</p>
      <ul className="gl-suggest">
        {visible.map((s) => (
          <li key={s.term}>
            <strong>{s.term}</strong>
            <span>{s.expansion}</span>
            <button type="button" className="gl-row-note" onClick={() => navigate(noteHref(s.noteId))}>
              <Icon name="note" /> {titleOf(s.noteId)}
            </button>
            <button type="button" className="b-btn b-btn-primary" onClick={() => void createTerm({ term: s.term, expansion: s.expansion, tags: tagFilter ? [tagFilter] : [] })}>
              <Icon name="plus" /> Übernehmen
            </button>
            <button type="button" className="b-icon-btn" aria-label="Ignorieren" title="Ignorieren" onClick={() => setSkipped((x) => new Set(x).add(s.term))}>
              <Icon name="x" />
            </button>
          </li>
        ))}
      </ul>
      {visible.length > 1 && (
        <button
          type="button"
          className="b-btn"
          onClick={async () => {
            for (const s of visible) await createTerm({ term: s.term, expansion: s.expansion, tags: tagFilter ? [tagFilter] : [] });
          }}
        >
          Alle {visible.length} übernehmen
        </button>
      )}
    </div>
  );
}

/** Abfrage wie Karteikarten: Abkürzung zeigen, Langform aufdecken – oder umgekehrt. */
function GlossaryQuiz({ terms, onClose }: { terms: Term[]; onClose: () => void }) {
  const pool = useMemo(() => terms.filter((t) => t.expansion || t.definition), [terms]);
  const [order, setOrder] = useState(() => shuffle(pool.length));
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [again, setAgain] = useState<number[]>([]);
  const [known, setKnown] = useState(0);
  const done = pos >= order.length;
  const card = done ? null : pool[order[pos]];

  function answer(ok: boolean) {
    if (ok) setKnown((k) => k + 1);
    else setAgain((a) => [...a, order[pos]]);
    setShown(false);
    setPos((p) => p + 1);
  }

  function restart(onlyWrong: boolean) {
    const next = onlyWrong ? again : shuffle(pool.length);
    setOrder(onlyWrong ? shuffle(next.length).map((i) => next[i]) : next);
    setAgain([]);
    setKnown(0);
    setPos(0);
    setShown(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ' && !done) {
        e.preventDefault();
        setShown(true);
      } else if (shown && (e.key === 'ArrowRight' || e.key === 'j')) answer(true);
      else if (shown && (e.key === 'ArrowLeft' || e.key === 'n')) answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const front = card ? (reverse ? card.expansion || card.definition : card.term) : '';

  return (
    <motion.div className="gl-quiz-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="gl-quiz" onMouseDown={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}>
        <div className="gl-quiz-head">
          <button type="button" className={`b-chip-btn${reverse ? ' active' : ''}`} onClick={() => setReverse((r) => !r)}>
            <Icon name="swap" /> {reverse ? 'Langform → Abkürzung' : 'Abkürzung → Langform'}
          </button>
          <span>
            {Math.min(pos + 1, order.length)} / {order.length}
          </span>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="gl-quiz-progress">
          <motion.span animate={{ width: `${(pos / Math.max(1, order.length)) * 100}%` }} />
        </div>
        {card ? (
          <>
            <AnimatePresence mode="wait">
              <motion.button key={`${pos}-${shown}`} type="button" className={`gl-quiz-card${shown ? ' is-shown' : ''}`} onClick={() => setShown(true)} initial={{ rotateX: -8, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <span className={reverse ? 'gl-quiz-front is-long' : 'gl-quiz-front'}>{front}</span>
                {shown ? (
                  <span className="gl-quiz-back">
                    <strong>{reverse ? card.term : card.expansion}</strong>
                    {card.definition && (reverse ? card.expansion : true) && <span>{card.definition}</span>}
                  </span>
                ) : (
                  <span className="gl-quiz-hint">Klicken oder Leertaste zum Aufdecken</span>
                )}
              </motion.button>
            </AnimatePresence>
            <div className="gl-quiz-actions">
              <button type="button" className="b-btn" disabled={!shown} onClick={() => answer(false)}>
                Nochmal <kbd>←</kbd>
              </button>
              <button type="button" className="b-btn b-btn-ok" disabled={!shown} onClick={() => answer(true)}>
                Gewusst <kbd>→</kbd>
              </button>
            </div>
          </>
        ) : (
          <div className="gl-quiz-done">
            <strong>
              {known} von {order.length} gewusst
            </strong>
            <p>{again.length ? `${again.length} Begriffe solltest du dir nochmal ansehen.` : 'Alles gewusst – stark!'}</p>
            <div className="gl-quiz-actions">
              {again.length > 0 && (
                <button type="button" className="b-btn b-btn-primary" onClick={() => restart(true)}>
                  Nur die falschen nochmal
                </button>
              )}
              <button type="button" className="b-btn" onClick={() => restart(false)}>
                Von vorn
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
