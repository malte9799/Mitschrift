import { useEffect, useRef, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Icon, type IconName } from '@/ui/Icon';
import { openTermDialog } from '@/glossary/store';
import { guessTerm } from '@/glossary/match';
import { commentSelection } from './sideNotes/CommentMark';
import { normalizeHrefInput } from '@/lib/url';
import { formatShortcut } from '@/ui/shortcut';

interface ToolbarProps {
  editor: Editor;
}

/** Event, mit dem z. B. der Format-Tab das Link-Eingabefeld der Toolbar öffnet. */
export const OPEN_LINK_EVENT = 'mitschrift:open-link';

/** Setzt/entfernt einen Link auf der aktuellen Auswahl. Leerer Wert entfernt ihn. */
export function applyLink(editor: Editor, url: string) {
  const href = url.trim();
  if (!href) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  const safe = normalizeHrefInput(href);
  if (!safe) return; // z. B. javascript: – wird nicht gesetzt
  editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
}

/** Markierten Text als Glossar-Begriff anlegen – „Domain Name System (DNS)“ wird gleich aufgeteilt. */
export function termFromSelection(editor: Editor) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, ' ').trim();
  openTermDialog(text ? guessTerm(text) : {});
}

const marks: { name: string; icon: IconName; label: string; toggle: (e: Editor) => void }[] = [
  { name: 'bold', icon: 'bold', label: 'Fett', toggle: (e) => e.chain().focus().toggleBold().run() },
  { name: 'italic', icon: 'italic', label: 'Kursiv', toggle: (e) => e.chain().focus().toggleItalic().run() },
  { name: 'strike', icon: 'strike', label: 'Durchgestrichen', toggle: (e) => e.chain().focus().toggleStrike().run() },
  { name: 'code', icon: 'code', label: 'Inline-Code', toggle: (e) => e.chain().focus().toggleCode().run() },
  { name: 'cloze', icon: 'cloze', label: 'Als Lücke markieren', toggle: (e) => e.chain().focus().toggleCloze().run() },
  { name: 'kbd', icon: 'kbd', label: 'Taste', toggle: (e) => e.chain().focus().toggleKbd().run() },
  { name: 'subscript', icon: 'subscript', label: 'Tiefgestellt', toggle: (e) => e.chain().focus().toggleSubscript().run() },
  { name: 'superscript', icon: 'superscript', label: 'Hochgestellt', toggle: (e) => e.chain().focus().toggleSuperscript().run() },
];

/** Format-Popover bei Textauswahl, inkl. Inline-Link-Eingabe statt window.prompt. */
export function Toolbar({ editor }: ToolbarProps) {
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function openLink() {
    setLinkValue((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkMode(true);
  }

  useEffect(() => {
    window.addEventListener(OPEN_LINK_EVENT, openLink);
    return () => window.removeEventListener(OPEN_LINK_EVENT, openLink);
  });

  useEffect(() => {
    if (linkMode) inputRef.current?.focus();
  }, [linkMode]);

  useEffect(() => {
    const close = () => setLinkMode(false);
    editor.on('selectionUpdate', close);
    return () => {
      editor.off('selectionUpdate', close);
    };
  }, [editor]);

  const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

  return (
    <BubbleMenu
      editor={editor}
      className="c-editor-toolbar"
      options={{ placement: 'top', offset: 8 }}
      // Nur bei Textauswahl – nicht, wenn ein ganzer Block (Diagramm, Quiz, Bild …) markiert ist.
      shouldShow={({ state, from, to, view }) =>
        from !== to &&
        !(state.selection instanceof NodeSelection) &&
        editor.isEditable &&
        (view.hasFocus() || !!document.activeElement?.closest('.c-editor-toolbar'))
      }
    >
      {linkMode ? (
        <form
          className="c-editor-toolbar-link"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink(editor, linkValue);
            setLinkMode(false);
          }}
        >
          <Icon name="link" />
          <input
            ref={inputRef}
            value={linkValue}
            placeholder="Link einfügen …"
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setLinkMode(false);
                editor.commands.focus();
              }
            }}
          />
          <button type="submit" aria-label="Übernehmen">
            <Icon name="check" />
          </button>
        </form>
      ) : (
        <>
          {marks.map((m) => (
            <button
              key={m.name}
              type="button"
              className={editor.isActive(m.name) ? 'active' : ''}
              onMouseDown={preventFocusLoss}
              onClick={() => m.toggle(editor)}
              aria-label={m.label}
              title={m.label}
            >
              <Icon name={m.icon} />
            </button>
          ))}
          <button
            type="button"
            className={editor.isActive('link') ? 'active' : ''}
            onMouseDown={preventFocusLoss}
            onClick={openLink}
            aria-label="Link"
            title="Link"
          >
            <Icon name="link" />
          </button>
          <span className="c-editor-toolbar-sep" />
          <button type="button" onMouseDown={preventFocusLoss} onClick={() => commentSelection(editor)} aria-label="Kommentieren" title={`Kommentieren (${formatShortcut('⌥⌘M')})`}>
            <Icon name="sticky" />
          </button>
          <button type="button" onMouseDown={preventFocusLoss} onClick={() => termFromSelection(editor)} aria-label="Als Begriff ins Glossar" title={`Als Begriff ins Glossar (${formatShortcut('⇧⌘G')})`}>
            <Icon name="book" />
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
