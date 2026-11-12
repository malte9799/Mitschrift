import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from '@/blocks/collection/Popover';
import { builtinTemplates, userTemplates } from './templates';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import type { Note, NotePatch } from '@/storage';
import { createNote, deleteNote, moveNote } from './actions';
import { NOTE_DRAG_TYPE } from '@/editor/NoteLink';
import { ancestorsOf, canMoveUnder, childrenMap, noteHref } from './noteLinks';
import { useTheme } from './theme';
import { FOCUS_SEARCH_EVENT } from './activeNote';
import { confirmDialog } from '@/ui/Dialog';
import { ownsKeys } from '@/ui/ownKeys';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function plainText(content: string): string {
  if (!content) return '';
  const out: string[] = [];
  const walk = (n: { text?: string; content?: unknown[] }) => {
    if (out.join(' ').length > 160) return;
    if (n.text) out.push(n.text);
    n.content?.forEach((c) => walk(c as typeof n));
  };
  try {
    walk(JSON.parse(content));
  } catch {
    return '';
  }
  return out.join(' ');
}

const TAG_FILTER_KEY = 'mitschrift-tag-filter';
const TREE_OPEN_KEY = 'mitschrift-tree-open';

function loadOpen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(TREE_OPEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function relativeDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

/** Linke Leiste: Suche (⌘K), neue Notiz, Favoriten und alle Notizen. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const notes = useNotes();
  const tags = useTags();
  const [query, setQuery] = useState('');
  const [templateMenu, setTemplateMenu] = useState<HTMLElement | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TAG_FILTER_KEY);
    } catch {
      return null;
    }
  });
  const tagById = useMemo(() => new Map((tags ?? []).map((t) => [t.id, t])), [tags]);
  // Gelöschtes Tag als Filter ignorieren.
  const activeFilter = tagFilter && tagById.has(tagFilter) ? tagFilter : null;

  const activeTag = activeFilter ? tagById.get(activeFilter) : undefined;
  const [tagMenu, setTagMenu] = useState<HTMLElement | null>(null);
  const [moreMenu, setMoreMenu] = useState<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  function setFilter(next: string | null) {
    setTagFilter(next);
    try {
      if (next) localStorage.setItem(TAG_FILTER_KEY, next);
      else localStorage.removeItem(TAG_FILTER_KEY);
    } catch {
      /* ignorieren */
    }
  }
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [openIds, setOpenIds] = useState(loadOpen);
  const [dragId, setDragId] = useState<string | null>(null);
  /** Ablageziel beim Ziehen: Notiz-ID oder `root` für die oberste Ebene. */
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function setOpen(id: string, open: boolean) {
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem(TREE_OPEN_KEY, JSON.stringify([...next]));
      } catch {
        /* ignorieren */
      }
      return next;
    });
  }

  // Eltern der geöffneten Notiz aufklappen, damit sie im Baum sichtbar ist.
  const activeId = location.pathname.match(/^\/n\/([^/]+)/)?.[1] ?? null;
  useEffect(() => {
    if (!notes || !activeId) return;
    for (const a of ancestorsOf(activeId, notes)) setOpen(a.id, true);
  }, [activeId, notes]);

  const children = useMemo(() => childrenMap(notes ?? []), [notes]);
  const { theme, next } = useTheme();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes ?? []) for (const id of n.tags) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [notes]);

  function go(path: string) {
    navigate(path);
    if (window.innerWidth <= 860) onClose();
  }

  const moreItems = [
    { path: '/', label: 'Übersicht', icon: 'home', active: location.pathname === '/' },
    { path: '/handbuch', label: 'Handbuch', icon: 'sparkle', active: location.pathname.startsWith('/handbuch') },
    { path: '/glossar', label: 'Glossar', icon: 'book', active: location.pathname === '/glossar' },
  ] as const;
  const moreActive = moreItems.some((m) => m.active && m.path !== '/');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !ownsKeys(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    // Aus der Menüleiste: Leiste ist dann schon offen, nach dem Einblenden fokussieren.
    function onFocusSearch() {
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      });
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(FOCUS_SEARCH_EVENT, onFocusSearch);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!notes) return [];
    const byTag = activeFilter ? notes.filter((n) => n.tags.includes(activeFilter)) : notes;
    if (!q) return byTag;
    return byTag.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        plainText(n.content).toLowerCase().includes(q) ||
        n.tags.some((id) => tagById.get(id)?.name.toLowerCase().includes(q)),
    );
  }, [notes, query, activeFilter, tagById]);

  const starred = filtered.filter((n) => n.starred);
  const rest = filtered.filter((n) => !n.starred);
  // Ohne Suche/Filter als Baum (Unterseiten eingerückt), sonst als flache Trefferliste.
  const asTree = !query.trim() && !activeFilter;
  const roots = children.get(null) ?? [];

  async function onCreate(init: NotePatch = {}) {
    // Neue Notiz bekommt direkt das gefilterte Tag (eine Vorlage mit eigenen Tags behält ihre).
    const note = await createNote({ ...(activeFilter ? { tags: [activeFilter] } : {}), ...init });
    navigate(`/n/${note.id}`);
    if (window.innerWidth <= 860) onClose();
  }

  async function onCreateChild(parent: Note) {
    const note = await createNote({ parentId: parent.id, tags: parent.tags });
    setOpen(parent.id, true);
    navigate(noteHref(note.id));
    if (window.innerWidth <= 860) onClose();
  }

  async function onDelete(n: Note) {
    const hasChildren = (children.get(n.id)?.length ?? 0) > 0;
    const message = `„${n.title || 'Ohne Titel'}“ löschen?${hasChildren ? ' Die Unterseiten bleiben erhalten und rücken eine Ebene nach oben.' : ''}`;
    if (!(await confirmDialog(message, { confirmLabel: 'Löschen', danger: true }))) return;
    await deleteNote(n.id);
    if (location.pathname === `/n/${n.id}`) navigate('/');
  }

  const canDrop = (target: string | null) => !!dragId && !!notes && dragId !== target && canMoveUnder(dragId, target, notes);

  function dragOver(e: React.DragEvent, target: string | null) {
    if (!dragId) return;
    // Auch ungültige Ziele (sich selbst, eigene Unterseiten) nicht an die Liste durchreichen – dort hieße es „oberste Ebene“.
    e.stopPropagation();
    if (!canDrop(target)) {
      setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(target ?? 'root');
  }

  async function drop(e: React.DragEvent, target: string | null) {
    e.preventDefault();
    e.stopPropagation();
    const id = dragId;
    setDragId(null);
    setDropTarget(null);
    if (!id || !notes || !canDrop(target)) return;
    if (await moveNote(id, target, notes)) {
      if (target) setOpen(target, true);
    }
  }

  const renderItem = (n: Note, depth: number | null = null) => {
    const kids = depth === null ? [] : children.get(n.id) ?? [];
    const isOpen = kids.length > 0 && openIds.has(n.id);
    return (
      <motion.li
        key={n.id}
        layout="position"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.18 }}
        className={depth === null ? undefined : 'side-tree-item'}
        style={depth === null ? undefined : ({ '--depth': depth } as React.CSSProperties)}
      >
        <div
          className={`side-row${dropTarget === n.id ? ' is-drop' : ''}${dragId === n.id ? ' is-dragging' : ''}`}
          onDragOver={(e) => dragOver(e, n.id)}
          onDragLeave={() => setDropTarget((t) => (t === n.id ? null : t))}
          onDrop={(e) => drop(e, n.id)}
        >
          {depth !== null && kids.length > 0 && (
            <button
              type="button"
              className={`side-twisty${isOpen ? ' is-open' : ''}`}
              aria-label={isOpen ? 'Unterseiten einklappen' : 'Unterseiten ausklappen'}
              aria-expanded={isOpen}
              onClick={() => setOpen(n.id, !isOpen)}
            >
              <Icon name="chevron" />
            </button>
          )}
          <NavLink
            to={noteHref(n.id)}
            className="side-note"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/uri-list', window.location.origin + noteHref(n.id));
              e.dataTransfer.setData('text/plain', `[${n.title || 'Ohne Titel'}](${noteHref(n.id)})`);
              e.dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify({ id: n.id, title: n.title }));
              e.dataTransfer.effectAllowed = 'copyMove';
              setDragId(n.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropTarget(null);
            }}
            onClick={() => window.innerWidth <= 860 && onClose()}
          >
            <span className="side-note-title">
              {n.starred && <Icon name="star" className="side-star" />}
              {n.title || 'Ohne Titel'}
            </span>
            <span className="side-note-sub">
              {n.tags.some((id) => tagById.has(id)) && (
                <span className="side-note-tags">
                  {n.tags.map((id) => {
                    const t = tagById.get(id);
                    return t && <span key={id} className="tag-dot" data-color={t.color} title={t.name} />;
                  })}
                </span>
              )}
              <span>{relativeDate(n.updatedAt)}</span>
              <span className="side-note-preview">{plainText(n.content)}</span>
            </span>
          </NavLink>
          <span className="side-note-actions">
            <button type="button" aria-label="Unterseite hinzufügen" title="Unterseite hinzufügen" onClick={() => onCreateChild(n)}>
              <Icon name="plus" />
            </button>
            <button type="button" className="is-danger" aria-label="Notiz löschen" title="Löschen" onClick={() => onDelete(n)}>
              <Icon name="trash" />
            </button>
          </span>
        </div>
        {isOpen && depth !== null && (
          <ul>
            <AnimatePresence initial={false}>{kids.map((k) => renderItem(k, depth + 1))}</AnimatePresence>
          </ul>
        )}
      </motion.li>
    );
  };

  /** Neue Notiz (+ Vorlagen), Graph, Kalender, Mehr – oben mit Text untereinander, beim Scrollen als Icon-Zeile im Kopf. */
  const navButtons = (iconOnly: boolean) => {
    const tab = iconOnly === compact ? undefined : -1;
    const item = (label: string, icon: Parameters<typeof Icon>[0]['name'], active: boolean, onClick: (e: React.MouseEvent<HTMLButtonElement>) => void, extra?: object) => (
      <button
        type="button"
        className={`side-ico${active ? ' active' : ''}`}
        onClick={onClick}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        tabIndex={tab}
        {...extra}
      >
        <Icon name={icon} />
        {!iconOnly && <span className="side-ico-label">{label}</span>}
      </button>
    );
    return (
      <>
        <span className="side-ico-split">
          {item('Neue Notiz', 'plus', false, () => void onCreate())}
          <button
            type="button"
            className={`side-ico side-ico-caret${templateMenu ? ' active' : ''}`}
            aria-label="Neue Notiz aus Vorlage"
            title="Neue Notiz aus Vorlage"
            tabIndex={tab}
            onClick={(e) => setTemplateMenu(templateMenu ? null : e.currentTarget)}
          >
            <Icon name="chevron" />
          </button>
        </span>
        {item('Graph-Ansicht', 'graph', location.pathname === '/graph', () => go('/graph'))}
        {item('Kalender', 'calendar', location.pathname === '/kalender', () => go('/kalender'))}
        {item('Mehr', 'more', !!moreMenu || moreActive, (e) => setMoreMenu(moreMenu ? null : e.currentTarget), {
          'aria-haspopup': 'menu',
          'aria-expanded': !!moreMenu,
        })}
      </>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && <motion.div className="side-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <aside
        className={`side${open ? ' is-open' : ''}${scrolled ? ' is-scrolled' : ''}${compact ? ' is-compact' : ''}`}
        aria-label="Notizen"
        aria-hidden={!open}
        onScroll={(e) => {
          // Hysterese, damit das Schrumpfen des Kopfs nicht hin- und herspringt.
          const y = e.currentTarget.scrollTop;
          setScrolled((s) => (s ? y > 4 : y > 24));
          // Kompakte Icon-Zeile, sobald die Navigation mit Text unter dem Kopf verschwunden ist.
          const nav = navRef.current;
          const top = topRef.current;
          if (nav && top) setCompact(nav.getBoundingClientRect().bottom - 8 < top.getBoundingClientRect().bottom - (compact ? 40 : 0));
        }}
      >
        <div className="side-top" ref={topRef}>
          <div className="side-head">
            <button type="button" className="side-brand" onClick={() => go('/')} title="Zur Übersicht">
              <span className="side-logo" aria-hidden="true" />
              Mitschrift
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={next}
              aria-label={`Farbschema: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dunkel' : 'Hell'}`}
              title={`Farbschema: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dunkel' : 'Hell'}`}
            >
              <span className={`theme-dot theme-${theme}`} />
            </button>
          </div>

          <label className="side-search">
            <Icon name="search" />
            <input ref={searchRef} value={query} placeholder="Suchen" onChange={(e) => setQuery(e.target.value)} />
            <kbd>⌘K</kbd>
          </label>

          <div className="side-icons-wrap" aria-hidden={!compact}>
            <div className="side-icons" role="toolbar" aria-label="Navigation">
              {navButtons(true)}
            </div>
          </div>
        </div>

        <div className="side-nav" ref={navRef} aria-hidden={compact}>
          {navButtons(false)}
        </div>

        {templateMenu && (
          <Popover anchor={templateMenu} onClose={() => setTemplateMenu(null)} className="side-tpl-pop">
            <div className="b-pop-list">
              <p className="b-pop-label">Neue Notiz aus Vorlage</p>
              {[...builtinTemplates, ...userTemplates(notes ?? [])].map((t, i) => (
                <Fragment key={t.id}>
                  {i === builtinTemplates.length && <hr className="b-pop-sep" />}
                  <button
                    type="button"
                    className="b-pop-item"
                    onClick={() => {
                      setTemplateMenu(null);
                      void onCreate(t.init());
                    }}
                  >
                    <Icon name={t.icon} className="b-pop-icon" />
                    <span className="side-tpl-text">
                      {t.name}
                      <small>{t.hint}</small>
                    </span>
                  </button>
                </Fragment>
              ))}
              <p className="b-pop-empty">Eigene Vorlage: Notiz öffnen → Ablage → „Als Vorlage verwenden“.</p>
            </div>
          </Popover>
        )}

        {moreMenu && (
          <Popover anchor={moreMenu} onClose={() => setMoreMenu(null)} align="end">
            <div className="b-pop-list">
              {moreItems.map((m) => (
                <button
                  key={m.path}
                  type="button"
                  className={`b-pop-item${m.active ? ' is-active' : ''}`}
                  onClick={() => {
                    setMoreMenu(null);
                    go(m.path);
                  }}
                >
                  <Icon name={m.icon} className="b-pop-icon" />
                  {m.label}
                </button>
              ))}
            </div>
          </Popover>
        )}

        {tagMenu && tags && (
          <Popover anchor={tagMenu} onClose={() => setTagMenu(null)} align="end" className="side-tag-pop">
            <div className="b-pop-list">
              <p className="b-pop-label">Nach Tag filtern</p>
              <button
                type="button"
                className={`b-pop-item${!activeFilter ? ' is-active' : ''}`}
                onClick={() => {
                  setTagMenu(null);
                  setFilter(null);
                }}
              >
                <Icon name="note" className="b-pop-icon" />
                Alle Notizen
                {!activeFilter && <Icon name="check" className="side-tag-check" />}
              </button>
              <hr className="b-pop-sep" />
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`b-pop-item${activeFilter === t.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setTagMenu(null);
                    setFilter(activeFilter === t.id ? null : t.id);
                  }}
                >
                  <span className="side-tag-dot-wrap">
                    <span className="tag-dot" data-color={t.color} />
                  </span>
                  {t.name}
                  <span className="side-tag-count">{counts.get(t.id) ?? 0}</span>
                  {activeFilter === t.id && <Icon name="check" className="side-tag-check" />}
                </button>
              ))}
            </div>
          </Popover>
        )}

        <nav
          className={`side-list${dropTarget === 'root' ? ' is-drop-root' : ''}`}
          onDragOver={(e) => asTree && dragOver(e, null)}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
          }}
          onDrop={(e) => drop(e, null)}
        >
          {starred.length > 0 && (
            <>
              <h3>Favoriten</h3>
              <ul>
                <AnimatePresence initial={false}>{starred.map((n) => renderItem(n))}</AnimatePresence>
              </ul>
            </>
          )}
          <div className="side-list-head">
            <h3>{query ? 'Treffer' : 'Alle Notizen'}</h3>
            {tags && tags.length > 0 && (
              <span className={`side-tag-filter${activeTag ? ' is-set' : ''}`} data-color={activeTag?.color}>
                <button
                  type="button"
                  className="side-tag-btn"
                  onClick={(e) => setTagMenu(tagMenu ? null : e.currentTarget)}
                  aria-haspopup="menu"
                  aria-expanded={!!tagMenu}
                  title="Nach Tag filtern"
                >
                  {activeTag ? <span className="tag-dot" data-color={activeTag.color} /> : <Icon name="hash" />}
                  <span className="side-tag-btn-label">{activeTag ? activeTag.name : 'Tags'}</span>
                  {!activeTag && <Icon name="chevron" className="side-tag-caret" />}
                </button>
                {activeTag && (
                  <button type="button" className="side-tag-clear" aria-label="Filter aufheben" title="Filter aufheben" onClick={() => setFilter(null)}>
                    <Icon name="x" />
                  </button>
                )}
              </span>
            )}
          </div>
          <ul className={asTree ? 'side-tree' : undefined}>
            <AnimatePresence initial={false}>{asTree ? roots.map((n) => renderItem(n, 0)) : rest.map((n) => renderItem(n))}</AnimatePresence>
          </ul>
          {notes && filtered.length === 0 && <p className="side-empty">{query ? 'Nichts gefunden.' : activeFilter ? 'Keine Notizen in diesem Tag.' : 'Noch keine Notizen.'}</p>}
        </nav>
      </aside>
    </>
  );
}
