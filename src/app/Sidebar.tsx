import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import type { Note } from '@/storage';
import { TagChip } from '@/ui/TagChip';
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

  function toggleFilter(id: string) {
    const next = activeFilter === id ? null : id;
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

  async function onCreate() {
    // Neue Notiz bekommt direkt das gefilterte Fach.
    const note = await createNote(activeFilter ? { tags: [activeFilter] } : undefined);
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

  return (
    <>
      <AnimatePresence>
        {open && <motion.div className="side-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <aside className={`side${open ? ' is-open' : ''}`} aria-label="Notizen" aria-hidden={!open}>
        <div className="side-head">
          <span className="side-brand">
            <span className="side-logo" aria-hidden="true" />
            Mitschrift
          </span>
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

        <button type="button" className="side-new" onClick={onCreate}>
          <Icon name="plus" />
          Neue Notiz
        </button>

        <button
          type="button"
          className={`side-new side-graph${location.pathname === '/' ? ' active' : ''}`}
          onClick={() => {
            navigate('/');
            if (window.innerWidth <= 860) onClose();
          }}
        >
          <Icon name="home" />
          Übersicht
        </button>

        <button
          type="button"
          className={`side-new side-graph${location.pathname === '/graph' ? ' active' : ''}`}
          onClick={() => {
            navigate('/graph');
            if (window.innerWidth <= 860) onClose();
          }}
        >
          <Icon name="graph" />
          Graph-Ansicht
        </button>

        <button
          type="button"
          className={`side-new side-graph${location.pathname === '/glossar' ? ' active' : ''}`}
          onClick={() => {
            navigate('/glossar');
            if (window.innerWidth <= 860) onClose();
          }}
        >
          <Icon name="book" />
          Glossar
        </button>

        {tags && tags.length > 0 && (
          <div className="side-tags" role="group" aria-label="Nach Fach filtern">
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} active={activeFilter === t.id} onClick={() => toggleFilter(t.id)} />
            ))}
          </div>
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
          <h3>{query ? 'Treffer' : activeFilter ? tagById.get(activeFilter)?.name : 'Alle Notizen'}</h3>
          <ul className={asTree ? 'side-tree' : undefined}>
            <AnimatePresence initial={false}>{asTree ? roots.map((n) => renderItem(n, 0)) : rest.map((n) => renderItem(n))}</AnimatePresence>
          </ul>
          {notes && filtered.length === 0 && <p className="side-empty">{query ? 'Nichts gefunden.' : activeFilter ? 'Keine Notizen in diesem Fach.' : 'Noch keine Notizen.'}</p>}
        </nav>
      </aside>
    </>
  );
}
