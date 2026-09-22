import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { NoteEditor } from '@/editor/NoteEditor';
import { EditorSidebar } from '@/editor/EditorSidebar';
import { useNote } from '@/hooks/useNote';
import { Icon } from '@/ui/Icon';
import { deleteNote } from './actions';
import type { LayoutContext } from './AppLayout';

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

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_KEY, panelOpen ? '1' : '0');
    } catch {
      /* ignorieren */
    }
  }, [panelOpen]);

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

  if (loading) return null;
  if (!note) return <Navigate to="/" replace />;

  async function onDelete() {
    if (!window.confirm('Diese Notiz wirklich löschen?')) return;
    await deleteNote(id);
    navigate('/');
  }

  const showPanel = panelOpen && !learning && editor;

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
          {!learning && (
            <button
              type="button"
              className={`icon-btn${panelOpen ? ' active' : ''}`}
              onClick={() => setPanelOpen((o) => !o)}
              aria-label={panelOpen ? 'Block-Leiste ausblenden' : 'Block-Leiste einblenden'}
              title="Blöcke & Format"
            >
              <Icon name="sidebar" />
            </button>
          )}
        </div>
      </header>

      <motion.main className="note-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
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
        <AnimatePresence>
          {learning && (
            <motion.p className="learn-banner" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Icon name="play" /> Lernmodus – Lücken ausfüllen, Karten umdrehen, Quiz lösen.
            </motion.p>
          )}
        </AnimatePresence>
        <NoteEditor content={note.content} learning={learning} onChange={(json) => save({ content: json })} onEditorReady={setEditor} />
      </motion.main>

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
