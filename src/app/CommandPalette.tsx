import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { blockTypes, categoryLabels } from '@/editor/blockTypes';
import { handbuchPages } from './handbuch/registry';
import { openTermDialog, useTerms } from '@/glossary/store';
import { useActiveNote } from './activeNote';
import { closePalette, getCommands, usePaletteOpen } from './paletteStore';
import { noteText } from './noteText';
import { noteHref } from './noteLinks';
import { loadViewed } from './recentViews';
import { formatShortcut } from '@/ui/shortcut';
import '@/styles/palette.css';

interface Result {
  key: string;
  group: string;
  icon: IconName;
  title: string;
  /** Zweite Zeile bzw. Pfad, z. B. Menüpfad oder Textausschnitt. */
  hint?: string;
  shortcut?: string;
  checked?: boolean;
  score: number;
  run: () => void;
}

const GROUP_ORDER = ['Notizen', 'Blöcke einfügen', 'Befehle & Einstellungen', 'Glossar', 'Handbuch'];
const LIMIT: Record<string, number> = { Notizen: 8, 'Blöcke einfügen': 6, 'Befehle & Einstellungen': 8, Glossar: 4, Handbuch: 4 };

const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Wie gut passt `text` zur Suche? 0 = gar nicht. Wortanfänge zählen mehr als Treffer mittendrin. */
function score(text: string, q: string): number {
  const t = norm(text);
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const i = t.indexOf(q);
  if (i < 0) {
    // Alle Suchwörter irgendwo enthalten („farbe dunkel“ findet „Farbschema › Dunkel“).
    const words = q.split(/\s+/).filter(Boolean);
    return words.length > 1 && words.every((w) => t.includes(w)) ? 30 : 0;
  }
  return /[\s›/(„-]/.test(t[i - 1] ?? ' ') ? 60 : 40;
}

/** Textausschnitt rund um den Treffer. */
function snippet(text: string, q: string) {
  const i = norm(text).indexOf(q);
  if (i < 0) return text.slice(0, 90);
  const start = Math.max(0, i - 30);
  return (start > 0 ? '…' : '') + text.slice(start, start + 100);
}

/**
 * ⌘K: Suchpalette in der Mitte – Notizen (Titel und Volltext), Blöcke zum Einfügen in die
 * offene Notiz, alle Menübefehle samt Einstellungen, Glossar-Begriffe und Handbuch-Seiten.
 */
export function CommandPalette() {
  const open = usePaletteOpen();
  return <AnimatePresence>{open && <PaletteDialog />}</AnimatePresence>;
}

function PaletteDialog() {
  const navigate = useNavigate();
  const notes = useNotes();
  const terms = useTerms();
  const active = useActiveNote();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(document.activeElement);
  // Befehle einmal beim Öffnen holen – sie hängen am aktuellen Zustand der Menüleiste.
  const [commands] = useState(getCommands);
  const editor = active?.editor && !active.learning ? active.editor : null;

  useEffect(() => {
    inputRef.current?.focus();
    const back = returnFocus.current;
    return () => {
      if (back instanceof HTMLElement && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const out: Result[] = [];

    // Notizen: ohne Suche die zuletzt angesehenen, sonst Titel vor Volltext.
    const all = notes ?? [];
    if (!q) {
      const viewed = loadViewed();
      const recent = all.filter((n) => viewed[n.id]).sort((a, b) => viewed[b.id] - viewed[a.id]);
      for (const n of (recent.length ? recent : all).slice(0, 6)) {
        out.push({ key: `n:${n.id}`, group: 'Notizen', icon: 'note', title: n.title || 'Ohne Titel', hint: 'Zuletzt angesehen', score: 1, run: () => navigate(noteHref(n.id)) });
      }
    } else {
      for (const n of all) {
        const title = n.title || 'Ohne Titel';
        const st = score(title, q);
        const text = st ? '' : noteText(n);
        const sx = st ? 0 : norm(text).includes(q) ? 20 : 0;
        if (!st && !sx) continue;
        out.push({
          key: `n:${n.id}`,
          group: 'Notizen',
          icon: 'note',
          title,
          hint: st ? undefined : snippet(text, q),
          score: st || sx,
          run: () => navigate(noteHref(n.id)),
        });
      }
    }

    // Blöcke nur, wenn eine Notiz zum Bearbeiten offen ist.
    if (editor && q) {
      for (const b of blockTypes) {
        const s = Math.max(score(b.label, q), ...b.keywords.map((k) => (score(k, q) ? score(k, q) - 10 : 0)));
        if (s) out.push({ key: `b:${b.id}`, group: 'Blöcke einfügen', icon: b.icon, title: b.label, hint: categoryLabels[b.category], score: s, run: () => b.run(editor) });
      }
    }

    if (q) {
      // Blöcke aus dem Menü „Einfügen“ stehen schon oben unter „Blöcke einfügen“ – nicht doppelt zeigen.
      const blockLabels = new Set(out.filter((r) => r.group === 'Blöcke einfügen').map((r) => r.title));
      for (const c of commands) {
        if (c.path[0] === 'Einfügen' && blockLabels.has(c.label)) continue;
        const full = [...c.path, c.label].join(' › ');
        const s = Math.max(score(c.label, q), score(full, q) - 5);
        if (s)
          out.push({
            key: `c:${full}`,
            group: 'Befehle & Einstellungen',
            icon: c.checked ? 'check' : 'cursor',
            title: c.label,
            hint: c.path.join(' › '),
            shortcut: c.shortcut,
            checked: c.checked,
            score: s,
            run: c.action,
          });
      }
      for (const t of terms ?? []) {
        const s = Math.max(score(t.term, q), score(t.expansion, q) - 10);
        if (s) out.push({ key: `t:${t.id}`, group: 'Glossar', icon: 'book', title: t.term, hint: t.expansion, score: s, run: () => openTermDialog({ id: t.id }) });
      }
      for (const p of handbuchPages) {
        const s = score(p.title, q);
        if (s) out.push({ key: `h:${p.key}`, group: 'Handbuch', icon: 'sparkle', title: p.title, score: s, run: () => navigate(p.parent === null ? '/handbuch' : `/handbuch/${p.key}`) });
      }
    }

    const grouped = GROUP_ORDER.map((g) =>
      out
        .filter((r) => r.group === g)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT[g]),
    ).filter((g) => g.length);
    // Gruppe mit dem besten Treffer nach oben, sonst feste Reihenfolge.
    if (q) grouped.sort((a, b) => b[0].score - a[0].score);
    return grouped.flat();
  }, [query, notes, terms, commands, editor, navigate]);

  useEffect(() => setCursor(0), [query]);

  // Markierte Zeile im Blick behalten.
  useLayoutEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function choose(r: Result | undefined) {
    if (!r) return;
    closePalette();
    // Erst schließen, dann ausführen – sonst holt sich die Palette den Fokus zurück.
    requestAnimationFrame(() => r.run());
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[cursor]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePalette();
    } else if (e.key === 'Tab') {
      // Fokus bleibt im Suchfeld – die Liste wird mit den Pfeiltasten bedient.
      e.preventDefault();
    }
  }

  let lastGroup = '';
  return (
    <motion.div
      className="palette-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onMouseDown={(e) => e.target === e.currentTarget && closePalette()}
    >
      <motion.div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Suchen und Befehle"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.14 }}
      >
        <label className="palette-search">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={editor ? 'Notizen, Blöcke, Befehle, Einstellungen …' : 'Notizen, Befehle, Einstellungen …'}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[cursor] ? `palette-${cursor}` : undefined}
            aria-autocomplete="list"
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </label>
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef} aria-label="Ergebnisse">
          {results.length === 0 && <p className="palette-empty">{query ? `Nichts gefunden für „${query}“` : 'Noch keine Notizen.'}</p>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={r.key} role="presentation">
                {head && (
                  <p className="palette-group" role="presentation">
                    {head}
                  </p>
                )}
                <div
                  id={`palette-${i}`}
                  role="option"
                  aria-selected={i === cursor}
                  className={`palette-item${i === cursor ? ' is-active' : ''}`}
                  onMouseMove={() => i !== cursor && setCursor(i)}
                  onClick={() => choose(r)}
                >
                  <Icon name={r.icon} className="palette-icon" />
                  <span className="palette-text">
                    <span className="palette-title">{r.title}</span>
                    {r.hint && <span className="palette-hint">{r.hint}</span>}
                  </span>
                  {r.shortcut && <kbd className="palette-kbd">{formatShortcut(r.shortcut)}</kbd>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="palette-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> auswählen
          </span>
          <span>
            <kbd>↵</kbd> öffnen
          </span>
          <span>
            <kbd>{formatShortcut('⌘F')}</kbd> Seitenleiste durchsuchen
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
