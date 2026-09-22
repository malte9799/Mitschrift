import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/storage';
import { createNote, deleteNote } from './actions';
import { useTheme } from './theme';

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

function relativeDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

/** Linke Leiste: Suche (⌘K), neue Notiz, Favoriten und alle Notizen. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const notes = useNotes();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme, next } = useTheme();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!notes) return [];
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || plainText(n.content).toLowerCase().includes(q));
  }, [notes, query]);

  const starred = filtered.filter((n) => n.starred);
  const rest = filtered.filter((n) => !n.starred);

  async function onCreate() {
    const note = await createNote();
    navigate(`/n/${note.id}`);
    if (window.innerWidth <= 860) onClose();
  }

  async function onDelete(n: Note) {
    if (!window.confirm(`„${n.title || 'Ohne Titel'}“ löschen?`)) return;
    await deleteNote(n.id);
    if (location.pathname === `/n/${n.id}`) navigate('/');
  }

  const renderItem = (n: Note) => (
    <motion.li key={n.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
      <NavLink to={`/n/${n.id}`} className="side-note" onClick={() => window.innerWidth <= 860 && onClose()}>
        <span className="side-note-title">
          {n.starred && <Icon name="star" className="side-star" />}
          {n.title || 'Ohne Titel'}
        </span>
        <span className="side-note-sub">
          <span>{relativeDate(n.updatedAt)}</span>
          <span className="side-note-preview">{plainText(n.content)}</span>
        </span>
      </NavLink>
      <button type="button" className="side-note-delete" aria-label="Notiz löschen" onClick={() => onDelete(n)}>
        <Icon name="trash" />
      </button>
    </motion.li>
  );

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

        <nav className="side-list">
          {starred.length > 0 && (
            <>
              <h3>Favoriten</h3>
              <ul>
                <AnimatePresence initial={false}>{starred.map(renderItem)}</AnimatePresence>
              </ul>
            </>
          )}
          <h3>{query ? 'Treffer' : 'Alle Notizen'}</h3>
          <ul>
            <AnimatePresence initial={false}>{rest.map(renderItem)}</AnimatePresence>
          </ul>
          {notes && filtered.length === 0 && <p className="side-empty">{query ? 'Nichts gefunden.' : 'Noch keine Notizen.'}</p>}
        </nav>
      </aside>
    </>
  );
}
