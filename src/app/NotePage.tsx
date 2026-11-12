import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { NoteEditor } from '@/editor/NoteEditor';
import { EditorSidebar } from '@/editor/EditorSidebar';
import { useNote } from '@/hooks/useNote';
import { Icon } from '@/ui/Icon';
import { deleteNote } from './actions';
import { NoteTags } from './NoteTags';
import { NoteBreadcrumbs, NoteRelations } from './NoteRelations';
import type { LayoutContext } from './AppLayout';
import { setActiveNote } from './activeNote';
import { markViewed } from './recentViews';
import { confirmDialog } from '@/ui/Dialog';
import type { PMNode } from '@/export/model';
import { Presentation, buildSlides, slideAt } from './Presentation';

const PANEL_KEY = 'mitschrift-panel-open';

/** Eine Notiz: Kopfleiste (Modus-Umschalter), großer Titel, Editor, rechte Block-Leiste. */
export function NotePage() {
  const { id = '' } = useParams<{ id: string }>();
  return <NoteScreen key={id} id={id} />;
}

function NoteScreen({ id }: { id: string }) {
  const { note, loading, saved, save } = useNote(id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [learning, setLearning] = useState(false);
  const [presenting, setPresenting] = useState<{ doc: PMNode; start: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => {
    try {
      return localStorage.getItem(PANEL_KEY) !== '0' && window.innerWidth > 1100;
    } catch {
      return true;
    }
  });
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = note ? `${note.title || 'Ohne Titel'} – Mitschrift` : 'Mitschrift';
  }, [note?.title]);

  // Nur bewusstes Umschalten merken – nicht das automatische Ausblenden auf schmalen Fenstern.
  const togglePanel = () =>
    setPanelOpen((o) => {
      try {
        localStorage.setItem(PANEL_KEY, o ? '0' : '1');
      } catch {
        /* ignorieren */
      }
      return !o;
    });

  // Titel-Textarea wächst mit dem Inhalt.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, [note?.title, loading]);

  // Neue, leere Notiz: Titel direkt fokussieren.
  useEffect(() => {
    if (note && !note.title && !note.content) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur nach dem Laden
  }, [loading]);

  // Menüleiste über die geöffnete Notiz informieren.
  useEffect(() => {
    if (!note) return;
    setActiveNote({
      note,
      editor,
      saved,
      learning,
      setLearning,
      panelOpen,
      togglePanel,
      toggleStar: () => save({ starred: !note.starred }),
      toggleTemplate: () => save({ template: !note.template }),
      remove: onDelete,
      present,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Funktionen ändern sich nur mit diesen Werten
  }, [note, editor, saved, learning, panelOpen]);
  useEffect(() => () => setActiveNote(null), []);

  // Für „Zuletzt angesehen“ auf der Startseite.
  const found = !!note;
  useEffect(() => {
    if (found) markViewed(id);
  }, [id, found]);

  if (loading) return null;
  if (!note) return <Navigate to="/" replace />;

  function present(fromCursor = false) {
    if (!note) return;
    const doc: PMNode = editor ? (editor.getJSON() as PMNode) : note.content ? JSON.parse(note.content) : { type: 'doc', content: [] };
    const start = fromCursor && editor ? slideAt(buildSlides(doc), editor.state.selection.$from.index(0)) : 0;
    setPresenting({ doc, start });
  }

  async function onDelete() {
    if (!(await confirmDialog('Diese Notiz wirklich löschen?', { confirmLabel: 'Löschen', danger: true }))) return;
    await deleteNote(id);
    navigate('/');
  }

  const showPanel = panelOpen && !learning && editor;

  /**
   * Klick in den Spalt zwischen Titel/Tags und der ersten Zeile fügt ganz oben eine
   * leere Zeile ein – außer die erste Zeile ist schon leer, dann wird sie nur fokussiert.
   */
  function insertLineAtTop(e: React.MouseEvent, dom: HTMLElement): boolean {
    if (!editor) return false;
    const target = e.target as HTMLElement;
    if ((dom.contains(target) && target !== dom) || target.closest('.note-title, .note-tags, .learn-banner')) return false;
    const first = dom.firstElementChild;
    const header = (e.currentTarget as HTMLElement).querySelector('.note-tags') ?? titleRef.current;
    if (!first || !header) return false;
    if (e.clientY >= first.getBoundingClientRect().top || e.clientY <= header.getBoundingClientRect().bottom) return false;
    e.preventDefault();
    const top = editor.state.doc.firstChild;
    if (!(top?.type.name === 'paragraph' && top.content.size === 0)) {
      editor.chain().insertContentAt(0, { type: 'paragraph' }).run();
    }
    // Synchron fokussieren, damit schnelles Tippen nicht verloren geht.
    dom.focus({ preventScroll: true });
    editor.commands.setTextSelection(1);
    editor.commands.focus(null, { scrollIntoView: false });
    return true;
  }

  /** Klick in den leeren Bereich unter dem Text setzt den Cursor ans Ende der letzten Zeile. */
  function focusEndBelowEditor(e: React.MouseEvent) {
    if (!editor || learning || e.button !== 0) return;
    // Randnotizen und ihre Menüs (Portal, aber im React-Baum unter <main>) behandeln Klicks selbst.
    if ((e.target as Element).closest?.('.c-side-note, .b-pop, .note-relations, .note-crumbs')) return;
    const dom = editor.view.dom as HTMLElement;
    if (insertLineAtTop(e, dom)) return;
    if (dom.contains(e.target as Node) || e.clientY <= dom.getBoundingClientRect().bottom) return;
    e.preventDefault();
    const { doc } = editor.state;
    // Endet die Notiz mit einem Nicht-Text-Block (Quiz, Diagramm …), eine leere Zeile anhängen.
    if (!doc.lastChild?.isTextblock) editor.chain().insertContentAt(doc.content.size, { type: 'paragraph' }).run();
    // Nicht scrollen – nur den Cursor setzen.
    dom.focus({ preventScroll: true });
    editor.commands.focus('end', { scrollIntoView: false });
  }

  return (
    <div className={`note-screen${showPanel ? ' has-panel' : ''}`}>
      <header className="note-bar">
        <div className="note-bar-left">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}
          >
            <Icon name="menu" />
          </button>
          <span className={`save-dot${saved ? ' is-saved' : ''}`} title={saved ? 'Gespeichert' : 'Speichert …'} />
        </div>

        <div className="mode-switch" role="tablist" aria-label="Modus">
          {(
            [
              ['edit', 'Bearbeiten', 'pencil'],
              ['learn', 'Lernen', 'play'],
            ] as const
          ).map(([mode, label, icon]) => {
            const active = (mode === 'learn') === learning;
            return (
              <button key={mode} type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={() => setLearning(mode === 'learn')}>
                {active && <motion.span layoutId="mode-pill" className="mode-pill" transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }} />}
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="note-bar-right">
          <button type="button" className="icon-btn" onClick={() => present()} aria-label="Präsentieren" title="Präsentieren (⌥⌘P)">
            <Icon name="present" />
          </button>
          {!learning && (
            <button
              type="button"
              className={`icon-btn${panelOpen ? ' active' : ''}`}
              onClick={togglePanel}
              aria-label={panelOpen ? 'Block-Leiste ausblenden' : 'Block-Leiste einblenden'}
              title="Blöcke & Format"
            >
              <Icon name="sidebar" />
            </button>
          )}
        </div>
      </header>

      <motion.main className="note-page" onMouseDown={focusEndBelowEditor} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <NoteBreadcrumbs id={id} />
        <textarea
          ref={titleRef}
          className="note-title"
          rows={1}
          value={note.title}
          placeholder="Ohne Titel"
          readOnly={learning}
          onChange={(e) => save({ title: e.target.value.replace(/\n/g, ' ') })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || (e.key === 'ArrowDown' && e.currentTarget.selectionStart === e.currentTarget.value.length)) {
              e.preventDefault();
              if (!editor) return;
              // Synchron fokussieren – Tiptaps focus() wartet einen Frame, schnelle Eingaben landeten sonst im Titel.
              (editor.view.dom as HTMLElement).focus();
              editor.commands.focus('start');
            }
          }}
        />
        <NoteTags value={note.tags} readOnly={learning} onChange={(tags) => save({ tags })} />
        <AnimatePresence>
          {learning && (
            <motion.p className="learn-banner" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Icon name="play" /> Lernmodus – Lücken ausfüllen, Karten umdrehen, Quiz lösen.
            </motion.p>
          )}
        </AnimatePresence>
        <NoteEditor noteId={id} content={note.content} learning={learning} onChange={(json) => save({ content: json })} onEditorReady={setEditor} />
        <NoteRelations id={id} readOnly={learning} editor={editor} />
      </motion.main>

      {presenting && <Presentation note={note} doc={presenting.doc} startAt={presenting.start} onClose={() => setPresenting(null)} />}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="note-panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
          >
            <EditorSidebar editor={editor} note={note} onToggleStar={() => save({ starred: !note.starred })} onDelete={onDelete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
