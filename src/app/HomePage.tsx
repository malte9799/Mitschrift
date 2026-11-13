import { useEffect, useMemo, useState } from 'react';
import { noteText } from './noteText';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { Popover } from '@/blocks/collection/Popover';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import type { Note, Tag } from '@/storage';
import { createNote, seedIfFirstRun, toggleStar } from './actions';
import { noteHref } from './noteLinks';
import { useViewed } from './recentViews';
import { NotePreview } from './NotePreview';
import type { LayoutContext } from './AppLayout';
import { plural } from '@/ui/plural';

type Layout = 'grid' | 'mosaic' | 'list';
type Group = 'none' | 'tag' | 'date';
type Sort = 'name' | 'viewed' | 'created' | 'updated';
type Size = 's' | 'm' | 'l';

interface Prefs {
  layout: Layout;
  group: Group;
  sort: Sort;
  asc: boolean;
  size: Size;
  tag: string | null;
}

const PREFS_KEY = 'mitschrift-home';
const defaults: Prefs = { layout: 'grid', group: 'none', sort: 'updated', asc: false, size: 'm', tag: null };

function loadPrefs(): Prefs {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return defaults;
  }
}

const layouts: { value: Layout; label: string; icon: IconName }[] = [
  { value: 'grid', label: 'Raster', icon: 'layoutGrid' },
  { value: 'mosaic', label: 'Mosaik', icon: 'layoutMosaic' },
  { value: 'list', label: 'Liste', icon: 'layoutList' },
];
const groups: { value: Group; label: string }[] = [
  { value: 'none', label: 'Keine' },
  { value: 'tag', label: 'Tags' },
  { value: 'date', label: 'Datum' },
];
const sorts: { value: Sort; label: string; asc: [string, string] }[] = [
  { value: 'updated', label: 'Bearbeitet', asc: ['Älteste zuerst', 'Neueste zuerst'] },
  { value: 'viewed', label: 'Zuletzt angesehen', asc: ['Älteste zuerst', 'Neueste zuerst'] },
  { value: 'created', label: 'Erstellt', asc: ['Älteste zuerst', 'Neueste zuerst'] },
  { value: 'name', label: 'Name', asc: ['A → Z', 'Z → A'] },
];
const sizes: { value: Size; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
const title = (n: Note) => n.title.trim() || 'Ohne Titel';

const DAY = 86_400_000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Zeitraum-Gruppe eines Datums: Heute, Gestern, … danach Monate. */
function dateBucket(ts: number | undefined): { key: string; label: string } {
  if (!ts) return { key: 'never', label: 'Nie geöffnet' };
  const today = startOfDay(Date.now());
  const day = startOfDay(ts);
  if (day >= today) return { key: 'd0', label: 'Heute' };
  if (day >= today - DAY) return { key: 'd1', label: 'Gestern' };
  if (day >= today - 6 * DAY) return { key: 'd7', label: 'Letzte 7 Tage' };
  if (day >= today - 29 * DAY) return { key: 'd30', label: 'Letzte 30 Tage' };
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return {
    key: `m${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleDateString('de-DE', sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' }),
  };
}

function formatDate(ts: number | undefined): string {
  if (!ts) return 'nie';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'gerade eben';
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min.`;
  const d = new Date(ts);
  if (startOfDay(ts) === startOfDay(Date.now())) return `heute, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  if (startOfDay(ts) === startOfDay(Date.now()) - DAY) return 'gestern';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('de-DE', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Section {
  key: string;
  label: string;
  tag?: Tag;
  notes: Note[];
}

/** Startseite: alle Notizen als Raster, Mosaik oder Liste – mit echter Seitenvorschau. */
export function HomePage() {
  const notes = useNotes();
  const tags = useTags();
  const viewed = useViewed();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const [seeded, setSeeded] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<{ kind: 'group' | 'sort'; anchor: HTMLElement } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = 'Mitschrift';
    seedIfFirstRun().finally(() => setSeeded(true));
  }, []);

  function update(patch: Partial<Prefs>) {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignorieren */
      }
      return next;
    });
  }

  const tagList = useMemo(() => tags ?? [], [tags]);
  const tagById = useMemo(() => new Map(tagList.map((t) => [t.id, t])), [tagList]);
  const activeTag = prefs.tag && tagById.has(prefs.tag) ? prefs.tag : null;
  const byId = useMemo(() => new Map((notes ?? []).map((n) => [n.id, n])), [notes]);

  /** Das Datum, nach dem sortiert/gruppiert wird (bei Name: Bearbeitet). */
  const dateOf = (n: Note): number | undefined =>
    prefs.sort === 'created' ? n.createdAt : prefs.sort === 'viewed' ? viewed[n.id] : n.updatedAt;

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = notes ?? [];
    if (activeTag) list = list.filter((n) => n.tags.includes(activeTag));
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          noteText(n).toLowerCase().includes(q) ||
          n.tags.some((id) => tagById.get(id)?.name.toLowerCase().includes(q)),
      );
    }
    const dir = prefs.asc ? 1 : -1;
    return [...list].sort((a, b) => {
      if (prefs.sort === 'name') return dir * collator.compare(title(a), title(b));
      // Nie geöffnete Notizen immer ans Ende.
      const da = dateOf(a) ?? -Infinity;
      const db = dateOf(b) ?? -Infinity;
      if (da === db) return collator.compare(title(a), title(b));
      if (da === -Infinity) return 1;
      if (db === -Infinity) return -1;
      return dir * (da - db);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dateOf hängt nur an prefs.sort/viewed
  }, [notes, query, activeTag, tagById, prefs.sort, prefs.asc, viewed]);

  const sections = useMemo<Section[]>(() => {
    if (prefs.group === 'none') return [{ key: 'all', label: '', notes: sorted }];
    if (prefs.group === 'tag') {
      // Eine Notiz mit mehreren Tags erscheint in jedem davon.
      const out: Section[] = tagList
        .filter((t) => !activeTag || t.id === activeTag)
        .map((t) => ({ key: t.id, label: t.name, tag: t, notes: sorted.filter((n) => n.tags.includes(t.id)) }));
      out.push({ key: 'untagged', label: 'Ohne Tags', notes: sorted.filter((n) => !n.tags.some((id) => tagById.has(id))) });
      return out.filter((s) => s.notes.length > 0);
    }
    const map = new Map<string, Section>();
    for (const n of sorted) {
      const b = dateBucket(dateOf(n));
      let s = map.get(b.key);
      if (!s) map.set(b.key, (s = { key: b.key, label: b.label, notes: [] }));
      s.notes.push(n);
    }
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dateOf hängt nur an prefs.sort/viewed
  }, [sorted, prefs.group, tagList, activeTag, tagById, prefs.sort, viewed]);

  if (!notes || !tags || !seeded) return null;

  async function onCreate() {
    const n = await createNote(activeTag ? { tags: [activeTag] } : undefined);
    navigate(noteHref(n.id));
  }

  const menuButton = sidebarOpen ? null : (
    <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label="Seitenleiste einblenden">
      <Icon name="menu" />
    </button>
  );

  if (notes.length === 0) {
    return (
      <div className="home-empty">
        {menuButton && <div className="home-menu">{menuButton}</div>}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.3 }}>
          <span className="home-illu" aria-hidden="true">
            <Icon name="note" />
          </span>
          <h1>Leeres Blatt</h1>
          <p>Leg deine erste Notiz an.</p>
          <button type="button" className="b-btn b-btn-primary" onClick={onCreate}>
            <Icon name="plus" /> Neue Notiz
          </button>
        </motion.div>
      </div>
    );
  }

  const sortMeta = sorts.find((s) => s.value === prefs.sort)!;
  const dateLabel = prefs.sort === 'created' ? 'Erstellt' : prefs.sort === 'viewed' ? 'Angesehen' : 'Bearbeitet';
  const count = sorted.length;

  const card = (n: Note, sectionKey: string) => {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    const noteTags = n.tags.map((id) => tagById.get(id)).filter((t): t is Tag => !!t);
    const open = () => navigate(noteHref(n.id));
    const star = (
      <button
        type="button"
        className={`lib-star${n.starred ? ' is-on' : ''}`}
        aria-label={n.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
        title={n.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
        onClick={(e) => {
          e.stopPropagation();
          void toggleStar(n.id, !n.starred);
        }}
      >
        <Icon name="star" />
      </button>
    );
    const date = (
      <span className="lib-date" title={`Bearbeitet ${formatDate(n.updatedAt)} · Erstellt ${formatDate(n.createdAt)}`}>
        {dateLabel} {formatDate(dateOf(n))}
      </span>
    );

    if (prefs.layout === 'list') {
      return (
        <motion.li key={`${sectionKey}:${n.id}`} layout="position" className="lib-row" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
          <a
            href={noteHref(n.id)}
            className="lib-row-link"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              open();
            }}
          >
            <div className="lib-row-thumb">
              <NotePreview note={n} tags={tagList} fit="fixed" />
            </div>
            <div className="lib-row-main">
              <span className="lib-title">
                {title(n)}
                {parent && <span className="lib-parent">in {title(parent)}</span>}
              </span>
              <span className="lib-snippet">{noteText(n).slice(0, 220) || 'Noch kein Inhalt'}</span>
              {noteTags.length > 0 && (
                <span className="lib-row-tags">
                  {noteTags.map((t) => (
                    <TagChip key={t.id} tag={t} />
                  ))}
                </span>
              )}
            </div>
            <div className="lib-row-dates">
              <span>
                <em>Bearbeitet</em> {formatDate(n.updatedAt)}
              </span>
              <span>
                <em>Erstellt</em> {formatDate(n.createdAt)}
              </span>
              <span>
                <em>Angesehen</em> {formatDate(viewed[n.id])}
              </span>
            </div>
          </a>
          {star}
        </motion.li>
      );
    }

    return (
      <motion.li
        key={`${sectionKey}:${n.id}`}
        layout="position"
        className="lib-card"
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <a
          href={noteHref(n.id)}
          className="lib-card-link"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            open();
          }}
        >
          <div className="lib-card-preview">
            <NotePreview note={n} tags={tagList} fit={prefs.layout === 'mosaic' ? 'natural' : 'fixed'} />
          </div>
          <div className="lib-card-info">
            <span className="lib-title">{title(n)}</span>
            <span className="lib-meta">
              {noteTags.length > 0 && (
                <span className="lib-dots">
                  {noteTags.map((t) => (
                    <span key={t.id} className="tag-dot" data-color={t.color} title={t.name} />
                  ))}
                </span>
              )}
              {date}
              {parent && <span className="lib-parent">in {title(parent)}</span>}
            </span>
          </div>
        </a>
        {star}
      </motion.li>
    );
  };

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="lib-screen">
      <header className="note-bar lib-bar">
        <div className="note-bar-left">
          <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}>
            <Icon name="menu" />
          </button>
        </div>
      </header>

      <main className="lib">
        <div className="lib-head">
          <div>
            <h1>Übersicht</h1>
            <p className="lib-sub">
              {count === notes.length ? plural(notes.length, 'Notiz', 'Notizen') : `${count} von ${plural(notes.length, 'Notiz', 'Notizen')}`}
              {tagList.length > 0 && ` · ${plural(tagList.length, 'Tag', 'Tags')}`}
            </p>
          </div>
          <button type="button" className="b-btn b-btn-primary" onClick={onCreate}>
            <Icon name="plus" /> Neue Notiz
          </button>
        </div>

        <div className="lib-toolbar">
          <label className="lib-search">
            <Icon name="search" />
            <input value={query} placeholder="Notizen durchsuchen" onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" aria-label="Suche leeren" onClick={() => setQuery('')}>
                <Icon name="x" />
              </button>
            )}
          </label>

          <div className="lib-controls">
            <button
              type="button"
              className={`lib-select${menu?.kind === 'group' ? ' is-open' : ''}`}
              onClick={(e) => setMenu(menu?.kind === 'group' ? null : { kind: 'group', anchor: e.currentTarget })}
            >
              <Icon name="group" />
              <span className="lib-select-label">Gruppieren:</span> {groups.find((g) => g.value === prefs.group)!.label}
              <Icon name="chevron" />
            </button>
            <button
              type="button"
              className={`lib-select${menu?.kind === 'sort' ? ' is-open' : ''}`}
              onClick={(e) => setMenu(menu?.kind === 'sort' ? null : { kind: 'sort', anchor: e.currentTarget })}
            >
              <Icon name={prefs.asc ? 'sortAsc' : 'sortDesc'} />
              <span className="lib-select-label">Sortieren:</span> {sortMeta.label}
              <Icon name="chevron" />
            </button>

            {prefs.layout !== 'list' && (
              <div className="lib-seg lib-size" role="radiogroup" aria-label="Kachelgröße">
                {sizes.map((s) => (
                  <button key={s.value} type="button" role="radio" aria-checked={prefs.size === s.value} className={prefs.size === s.value ? 'is-on' : ''} onClick={() => update({ size: s.value })}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="lib-seg" role="radiogroup" aria-label="Darstellung">
              {layouts.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.layout === l.value}
                  aria-label={l.label}
                  title={l.label}
                  className={prefs.layout === l.value ? 'is-on' : ''}
                  onClick={() => update({ layout: l.value })}
                >
                  {prefs.layout === l.value && <motion.span layoutId="lib-seg-pill" className="lib-seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
                  <Icon name={l.icon} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {tagList.length > 0 && (
          <div className="lib-tags" role="group" aria-label="Nach Tag filtern">
            {tagList.map((t) => (
              <TagChip key={t.id} tag={t} active={activeTag === t.id} onClick={() => update({ tag: activeTag === t.id ? null : t.id })} />
            ))}
          </div>
        )}

        {count === 0 ? (
          <p className="lib-empty">{query ? `Nichts gefunden für „${query}“.` : 'Keine Notizen in diesem Tag.'}</p>
        ) : (
          sections.map((s) => {
            const isCollapsed = collapsed.has(s.key);
            return (
              <section key={`${prefs.group}:${s.key}`} className="lib-section">
                {s.label && (
                  <button type="button" className="lib-section-head" aria-expanded={!isCollapsed} onClick={() => toggleSection(s.key)}>
                    <Icon name="chevron" className={`lib-twisty${isCollapsed ? ' is-closed' : ''}`} />
                    {s.tag && <span className="tag-dot" data-color={s.tag.color} />}
                    <span>{s.label}</span>
                    <span className="lib-count">{s.notes.length}</span>
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.ul
                      className={`lib-${prefs.layout} lib-size-${prefs.size}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {s.notes.map((n) => card(n, s.key))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </section>
            );
          })
        )}
      </main>

      {menu && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} align="end">
          <div className="b-pop-list">
            {menu.kind === 'group' ? (
              <>
                <p className="b-pop-label">Gruppieren nach</p>
                {groups.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className={`b-pop-item${prefs.group === g.value ? ' is-active' : ''}`}
                    onClick={() => {
                      update({ group: g.value });
                      setMenu(null);
                    }}
                  >
                    {g.label}
                    {prefs.group === g.value && <Icon name="check" className="b-pop-check" />}
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="b-pop-label">Sortieren nach</p>
                {sorts.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`b-pop-item${prefs.sort === s.value ? ' is-active' : ''}`}
                    // Name standardmäßig A → Z, Daten neueste zuerst.
                    onClick={() => update({ sort: s.value, asc: s.value === prefs.sort ? prefs.asc : s.value === 'name' })}
                  >
                    {s.label}
                    {prefs.sort === s.value && <Icon name="check" className="b-pop-check" />}
                  </button>
                ))}
                <hr className="b-pop-sep" />
                <p className="b-pop-label">Reihenfolge</p>
                {[true, false].map((asc) => (
                  <button key={String(asc)} type="button" className={`b-pop-item${prefs.asc === asc ? ' is-active' : ''}`} onClick={() => update({ asc })}>
                    <Icon name={asc ? 'sortAsc' : 'sortDesc'} className="b-pop-icon" />
                    {sortMeta.asc[asc ? 0 : 1]}
                    {prefs.asc === asc && <Icon name="check" className="b-pop-check" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}
