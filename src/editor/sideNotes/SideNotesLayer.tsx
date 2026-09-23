import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { Icon } from '@/ui/Icon';
import { AutoTextarea } from '@/ui/AutoTextarea';
import { Popover } from '@/blocks/collection/Popover';
import { useEditable } from '../useEditable';
import { setBlockSelection } from '../BlockSelection';
import { SideNoteTagPicker } from './SideNoteTagPicker';
import {
  addSideNote,
  getSideNotes,
  isSideNoteEmpty,
  removeSideNote,
  sideNoteColors,
  sideNoteStyles,
  sideNoteTagColor,
  sideNoteTagPresets,
  updateSideNote,
  type SideNote,
  type SideNoteColor,
  type SideNoteStyle,
} from './model';

/** Maße im Rand: Abstand zum Text (links Platz für den Griff), Mindestbreite, bevor Notizen zu Pins werden. */
const GAP = { left: 72, right: 32 } as const;
const EDGE = 16;
const MAX_W = 236;
const MIN_W = 150;
const PIN = 26;
const STACK_GAP = 10;

const PREFS_KEY = 'mitschrift-sidenote';

/** Zuletzt gewählte Darstellung – neue Notizen übernehmen sie. */
function loadPrefs(): { style: SideNoteStyle; color: SideNoteColor } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return {
      style: sideNoteStyles.some((s) => s.id === p.style) ? p.style : 'postit',
      color: p.color in sideNoteColors ? p.color : 'yellow',
    };
  } catch {
    return { style: 'postit', color: 'yellow' };
  }
}

function savePrefs(patch: Partial<{ style: SideNoteStyle; color: SideNoteColor }>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {
    /* ignorieren */
  }
}

/** Oberkante (Viewport) des obersten Blocks, in dem `pos` liegt. */
function blockTop(view: EditorView, pos: number): number | null {
  const { doc } = view.state;
  if (!doc.childCount) return null;
  const $p = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  const dom = view.nodeDOM($p.posAtIndex(Math.min($p.index(0), doc.childCount - 1), 0));
  return dom instanceof HTMLElement ? dom.getBoundingClientRect().top : null;
}

/** Letzter oberster Block, dessen Oberkante über `y` liegt (sonst der erste). */
function blockAtY(view: EditorView, y: number): { pos: number; top: number } | null {
  let hit: { pos: number; top: number } | null = null;
  view.state.doc.forEach((_node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const top = dom.getBoundingClientRect().top;
    if (!hit || top <= y) hit = { pos: offset, top };
  });
  return hit;
}

/** Leere Notizen verschwinden, sobald man sie verlässt. */
function dropIfEmpty(editor: Editor, id: string) {
  const cur = getSideNotes(editor.state).find((n) => n.id === id);
  if (cur && isSideNoteEmpty(cur)) removeSideNote(editor, id);
}

/** Leichte, aber je Notiz feste Schräglage für Post-its. */
function tilt(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.6;
}

/**
 * Randnotizen neben dem Text: Doppelklick in den linken oder rechten Rand legt eine an.
 * Liegt als Ebene im Editor-Körper und wird bei jeder Änderung neben ihren Block gesetzt;
 * überlappende Notizen einer Seite werden untereinander gestapelt. Ist der Rand zu schmal,
 * werden sie zu kleinen Pins, die sich per Klick öffnen.
 */
export function SideNotesLayer({ editor }: { editor: Editor }) {
  const editable = useEditable(editor);
  const [notes, setNotes] = useState(() => getSideNotes(editor.state));
  const [compact, setCompact] = useState({ left: false, right: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const sync = () => setNotes(getSideNotes(editor.state));
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
    };
  }, [editor]);

  function layout() {
    const layer = layerRef.current;
    const body = layer?.parentElement;
    const screen = body?.closest<HTMLElement>('.note-screen');
    if (!body || !screen || editor.isDestroyed) return;
    const b = body.getBoundingClientRect();
    const s = screen.getBoundingClientRect();
    const screenRight = s.left + screen.clientWidth;
    const space = { left: b.left - s.left - GAP.left - EDGE, right: screenRight - b.right - GAP.right - EDGE };
    const next = { left: space.left < MIN_W, right: space.right < MIN_W };
    if (next.left !== compact.left || next.right !== compact.right) {
      setCompact(next);
      return;
    }
    for (const side of ['left', 'right'] as const) {
      const width = Math.min(MAX_W, space[side]);
      const items = notes
        .filter((n) => n.side === side)
        .map((n) => ({ el: els.current.get(n.id), top: (blockTop(editor.view, n.pos) ?? b.top) - b.top + n.dy }))
        .sort((x, y) => x.top - y.top);
      let floor = -Infinity;
      for (const { el, top } of items) {
        if (!el) continue;
        const y = Math.max(top, floor);
        let x: number;
        if (next[side]) {
          el.style.width = '';
          x = side === 'left' ? s.left - b.left + 8 : screenRight - b.left - 8 - PIN;
        } else {
          el.style.width = `${width}px`;
          x = side === 'left' ? -GAP.left - width : b.width + GAP.right;
        }
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        // offsetHeight erzwingt das Layout – erst danach animieren, sonst fliegt die Notiz von oben links ein.
        floor = y + el.offsetHeight + STACK_GAP;
        el.dataset.placed = '';
      }
    }
  }

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  useLayoutEffect(() => layoutRef.current());

  // Neu anordnen, wenn sich Text, Fenster oder Seitenleisten ändern.
  useEffect(() => {
    const body = layerRef.current?.parentElement;
    const screen = body?.closest<HTMLElement>('.note-screen');
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => layoutRef.current());
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(editor.view.dom);
    if (body) ro.observe(body);
    if (screen) ro.observe(screen);
    editor.on('transaction', schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      editor.off('transaction', schedule);
    };
  }, [editor]);

  // Doppelklick in den Rand neben dem Text legt eine Notiz an.
  useEffect(() => {
    const body = layerRef.current?.parentElement;
    const screen = body?.closest<HTMLElement>('.note-screen');
    if (!body || !screen) return;
    function onDoubleClick(e: MouseEvent) {
      const t = e.target;
      if (!editor.isEditable || !(t instanceof Element) || !body) return;
      if (
        t.closest(
          '.c-side-note,.b-pop,.note-bar,.note-panel,.note-title,.note-tags,.learn-banner,input,textarea,button,[data-interactive],.c-editor-draghandle,.c-insert-menu,.c-editor-toolbar',
        )
      )
        return;
      const view = editor.view;
      if (view.dom.contains(t) && t !== view.dom) return;
      const b = body.getBoundingClientRect();
      const side = e.clientX < b.left ? 'left' : e.clientX > b.right ? 'right' : null;
      const block = side && blockAtY(view, e.clientY);
      // Neben Titel und Fächern gibt es keinen Block zum Anheften.
      if (!side || !block || e.clientY < block.top - 24) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      setBlockSelection(editor, []);
      const note: SideNote = {
        id: crypto.randomUUID(),
        pos: block.pos,
        dy: Math.max(0, Math.round(e.clientY - block.top - 14)),
        side,
        ...loadPrefs(),
        title: '',
        body: '',
        tags: [],
      };
      addSideNote(editor, note);
      setFocusId(note.id);
      setOpenId(note.id);
    }
    screen.addEventListener('dblclick', onDoubleClick);
    return () => screen.removeEventListener('dblclick', onDoubleClick);
  }, [editor]);

  // Geöffneter Pin schließt beim Klick daneben.
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && (e.target.closest(`[data-side-note="${openId}"]`) || e.target.closest('.b-pop'))) return;
      setOpenId(null);
      dropIfEmpty(editor, openId);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [editor, openId]);

  // Vorlagen plus alle Labels, die in dieser Notiz schon vergeben sind.
  const tagSuggestions = [...sideNoteTagPresets.map((t) => t.name), ...notes.flatMap((n) => n.tags)].filter(
    (t, i, all) => all.findIndex((o) => o.toLowerCase() === t.toLowerCase()) === i,
  );

  return (
    <div ref={layerRef} className="c-side-notes" aria-label="Randnotizen">
      {notes.map((note) => (
        <SideNoteItem
          key={note.id}
          editor={editor}
          note={note}
          editable={editable}
          compact={compact[note.side]}
          tagSuggestions={tagSuggestions}
          open={openId === note.id}
          autoFocus={focusId === note.id}
          onFocused={() => setFocusId(null)}
          onToggle={() => {
            if (openId !== note.id) return setOpenId(note.id);
            setOpenId(null);
            dropIfEmpty(editor, note.id);
          }}
          register={(el) => (el ? els.current.set(note.id, el) : els.current.delete(note.id))}
        />
      ))}
    </div>
  );
}

interface ItemProps {
  editor: Editor;
  note: SideNote;
  editable: boolean;
  compact: boolean;
  tagSuggestions: string[];
  open: boolean;
  autoFocus: boolean;
  onFocused: () => void;
  onToggle: () => void;
  register: (el: HTMLElement | null) => void;
}

function SideNoteItem({ editor, note, editable, compact, tagSuggestions, open, autoFocus, onFocused, onToggle, register }: ItemProps) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [tagPicker, setTagPicker] = useState<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const update = (patch: Partial<SideNote>) => updateSideNote(editor, note.id, patch);
  const hasBody = note.style !== 'title';

  useEffect(() => {
    if (!autoFocus || !titleRef.current) return;
    titleRef.current.focus({ preventScroll: true });
    onFocused();
  }, [autoFocus, onFocused, compact, open]);

  function closeMenu() {
    setMenu(null);
    // Schließt das Menü per Klick daneben, wandert der Fokus erst danach dorthin.
    requestAnimationFrame(() => {
      if (!bodyRef.current?.contains(document.activeElement)) dropIfEmpty(editor, note.id);
    });
  }

  function closeTagPicker() {
    setTagPicker(null);
    requestAnimationFrame(() => {
      // Nach Escape (Fokus im Nichts) zurück in den Titel, sonst wie beim Verlassen der Notiz.
      if (document.activeElement === document.body) titleRef.current?.focus({ preventScroll: true });
      else if (!bodyRef.current?.contains(document.activeElement)) dropIfEmpty(editor, note.id);
    });
  }

  function toggleTag(name: string) {
    const cur = getSideNotes(editor.state).find((n) => n.id === note.id)?.tags ?? note.tags;
    const has = cur.some((t) => t.toLowerCase() === name.toLowerCase());
    update({ tags: has ? cur.filter((t) => t.toLowerCase() !== name.toLowerCase()) : [...cur, name.trim()] });
  }

  const addTagButton = (corner: boolean) => (
    <button
      type="button"
      className={`c-side-note-tag-add${corner ? ' is-corner' : ''}${tagPicker ? ' is-open' : ''}`}
      aria-label="Label hinzufügen"
      title="Label hinzufügen"
      onMouseDown={(e) => e.preventDefault()}
      // An der Karte verankern: Der #-Knopf verschwindet, sobald das erste Label dran ist.
      onClick={() => setTagPicker(tagPicker ? null : bodyRef.current)}
    >
      <Icon name={corner ? 'hash' : 'plus'} />
    </button>
  );

  const tags = note.tags.length > 0 && (
    <div className="c-side-note-tags">
      {note.tags.map((t) => (
        <span key={t} className={`tag${editable ? ' is-removable' : ''}`} data-color={sideNoteTagColor(t)}>
          <span className="tag-main">
            <span className="tag-dot" aria-hidden="true" />
            <span className="tag-name">{t}</span>
          </span>
          {editable && (
            <button type="button" className="tag-remove" aria-label={`${t} entfernen`} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleTag(t)}>
              <Icon name="x" />
            </button>
          )}
        </span>
      ))}
      {editable && addTagButton(false)}
    </div>
  );

  const card = (
    <div
      ref={bodyRef}
      className={`c-side-note-card is-${note.style}`}
      style={note.style === 'postit' ? { rotate: `${tilt(note.id)}deg` } : undefined}
      onBlur={(e) => {
        if (menu || tagPicker || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        dropIfEmpty(editor, note.id);
      }}
    >
      {editable ? (
        <input
          ref={titleRef}
          className="c-side-note-title"
          value={note.title}
          placeholder={note.style === 'title' ? 'Randnotiz' : 'Titel'}
          onChange={(e) => update({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const next = bodyRef.current?.querySelector('textarea');
              if (next) next.focus();
              else e.currentTarget.blur();
            } else if (e.key === 'Escape') e.currentTarget.blur();
            // Backspace im leeren Titel löscht die Notiz – solange auch kein Text drinsteht.
            else if (e.key === 'Backspace' && isSideNoteEmpty(note)) {
              e.preventDefault();
              removeSideNote(editor, note.id);
            }
          }}
        />
      ) : (
        note.title && <p className="c-side-note-title">{note.title}</p>
      )}
      {tags}
      {hasBody &&
        (editable ? (
          <AutoTextarea
            className="c-side-note-body"
            value={note.body}
            placeholder="Notiz …"
            onChange={(e) => update({ body: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur();
              // Backspace im leeren Text springt zurück in den Titel.
              else if (e.key === 'Backspace' && !note.body) {
                e.preventDefault();
                const title = titleRef.current;
                title?.focus();
                title?.setSelectionRange(title.value.length, title.value.length);
              }
            }}
          />
        ) : (
          note.body && <p className="c-side-note-body">{note.body}</p>
        ))}
      {editable && note.tags.length === 0 && addTagButton(true)}
      {editable && (
        <button
          type="button"
          className={`c-side-note-more${menu ? ' is-open' : ''}`}
          aria-label="Randnotiz anpassen"
          title="Darstellung, Farbe, Seite"
          // Fokus im Textfeld lassen, sonst würde eine leere Notiz beim Öffnen des Menüs verschwinden.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => setMenu(menu ? null : e.currentTarget)}
        >
          <Icon name="more" />
        </button>
      )}
      {tagPicker && (
        <SideNoteTagPicker
          anchor={tagPicker}
          selected={note.tags}
          suggestions={tagSuggestions}
          onToggle={toggleTag}
          onClose={closeTagPicker}
          align={note.side === 'left' ? 'start' : 'end'}
        />
      )}
      {menu && (
        <Popover anchor={menu} onClose={closeMenu} align={note.side === 'left' ? 'start' : 'end'} className="c-side-note-pop">
          {/* Fokus bleibt im Textfeld – Klicks im Menü sollen nicht als Verlassen der Notiz zählen. */}
          <div onMouseDown={(e) => e.preventDefault()}>
          <p className="b-pop-label">Darstellung</p>
          <div className="b-pop-list">
            {sideNoteStyles.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`b-pop-item${s.id === note.style ? ' is-active' : ''}`}
                onClick={() => {
                  update({ style: s.id });
                  savePrefs({ style: s.id });
                }}
              >
                <span className={`c-side-note-swatch is-${s.id}`} style={{ '--tone': sideNoteColors[note.color].css } as CSSProperties} />
                <span className="c-side-note-pop-text">
                  {s.label}
                  <small>{s.hint}</small>
                </span>
                {s.id === note.style && <Icon name="check" className="b-pop-check" />}
              </button>
            ))}
          </div>
          <p className="b-pop-label">Farbe</p>
          <div className="c-callout-colors">
            {(Object.keys(sideNoteColors) as SideNoteColor[]).map((color) => (
              <button
                key={color}
                type="button"
                title={sideNoteColors[color].label}
                aria-label={sideNoteColors[color].label}
                className={color === note.color ? 'is-active' : ''}
                style={{ '--tone': sideNoteColors[color].css } as CSSProperties}
                onClick={() => {
                  update({ color });
                  savePrefs({ color });
                }}
              />
            ))}
          </div>
          <hr className="b-pop-sep" />
          <button type="button" className="b-pop-item" onClick={() => update({ side: note.side === 'left' ? 'right' : 'left' })}>
            <Icon name={note.side === 'left' ? 'arrowRight' : 'arrowLeft'} className="b-pop-icon" />
            {note.side === 'left' ? 'In den rechten Rand' : 'In den linken Rand'}
          </button>
          <button
            type="button"
            className="b-pop-item is-danger"
            onClick={() => {
              setMenu(null);
              removeSideNote(editor, note.id);
            }}
          >
            <Icon name="trash" className="b-pop-icon" />
            Löschen
          </button>
          </div>
        </Popover>
      )}
    </div>
  );

  return (
    <div
      ref={register}
      className={`c-side-note is-${note.side}${compact ? ' is-compact' : ''}`}
      data-side-note={note.id}
      data-interactive=""
      style={{ '--tone': sideNoteColors[note.color].css } as CSSProperties}
    >
      {compact ? (
        <>
          <button type="button" className={`c-side-note-pin${open ? ' is-open' : ''}`} onClick={onToggle} title={[note.title || 'Randnotiz', ...note.tags].join(' · ')} aria-expanded={open}>
            <Icon name="sticky" />
          </button>
          {open && <div className="c-side-note-float">{card}</div>}
        </>
      ) : (
        card
      )}
    </div>
  );
}
