import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Editor } from '@tiptap/react';
import { noteExtensions } from './extensions';
import { SlashCommand } from './SlashCommand';
import { NoteLink } from './NoteLink';
import { NoteLinkHover } from './noteBlock/NoteLinkHover';
import { GlossaryHover } from '@/glossary/GlossaryHover';
import { Toolbar } from './Toolbar';
import { DragHandle } from './DragHandle';
import { BlockSelection } from './BlockSelection';
import { useSnippets } from '@/hooks/useSnippets';
import { BlockBar } from './BlockBar';
import { SideNotes, getSideNotes, parseSideNotes, sideNotesKey } from './sideNotes/model';
import { SideNotesLayer } from './sideNotes/SideNotesLayer';
import { PageFrames } from './PageFrames';
import { InlineAtomEditor } from './InlineAtomEditor';
import { CodeWorkspaceHost } from '@/blocks/code/CodeWorkspace';

interface NoteEditorProps {
  /** ID der Notiz – für „[[“-Links (nicht auf sich selbst, Eltern neuer Unterseiten). */
  noteId?: string;
  content: string;
  onChange: (json: string) => void;
  /** Lernmodus: Editor ist schreibgeschützt, interaktive Blöcke werden zu Übungen. */
  learning: boolean;
  /** Meldet die Tiptap-Editor-Instanz nach oben, z. B. für die Bausteine-Seitenleiste. */
  onEditorReady?: Dispatch<SetStateAction<Editor | null>>;
}

/** Blockbasierter Rich-Text-Editor: Tiptap-Kern + Slash-Menü, Bubble-Toolbar, Drag-Handle. */
export function NoteEditor({ noteId, content, onChange, learning, onEditorReady }: NoteEditorProps) {
  const { snippets } = useSnippets();
  const snippetsRef = useRef(snippets);
  snippetsRef.current = snippets;
  const lastJson = useRef(content);
  // Randnotizen stehen im selben JSON wie der Text (Feld `sideNotes`), damit Anker und Inhalt zusammen gespeichert werden.
  const [initial] = useState(() => (content ? JSON.parse(content) : null));

  const editor = useEditor({
    immediatelyRender: true,
    editable: !learning,
    extensions: [...noteExtensions, SideNotes.configure({ initial: parseSideNotes(initial?.sideNotes) }), SlashCommand.configure({}), NoteLink],
    content: initial ?? '',
    // Über create/destroy melden statt per Effect: StrictMode erzeugt die Instanz
    // doppelt, ein Effect konnte sonst die bereits zerstörte Instanz nach oben geben.
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
      editor.on('destroy', () => onEditorReady?.((cur) => (cur === editor ? null : cur)));
    },
    // Statt onUpdate: Auch reine Randnotiz-Änderungen (ohne Text-Änderung) sollen speichern.
    onTransaction: ({ editor, transaction }) => {
      if ((!transaction.docChanged && !transaction.getMeta(sideNotesKey)) || transaction.getMeta('preventUpdate')) return;
      const sideNotes = getSideNotes(editor.state);
      const json = JSON.stringify(sideNotes.length ? { ...editor.getJSON(), sideNotes } : editor.getJSON());
      if (json === lastJson.current) return;
      lastJson.current = json;
      onChange(json);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.storage.slashCommand.getSnippets = () => snippetsRef.current;
  }, [editor, snippets]);

  useEffect(() => {
    if (editor) editor.storage.noteLink.currentId = noteId ?? null;
  }, [editor, noteId]);

  useEffect(() => {
    if (!editor || editor.isEditable === !learning) return;
    editor.setEditable(!learning);
  }, [editor, learning]);

  if (!editor) return null;

  return (
    <div className={`c-editor${learning ? ' is-learning' : ''}`}>
      {!learning && <Toolbar editor={editor} />}
      <div className="c-editor-body">
        {!learning && <DragHandle editor={editor} />}
        <PageFrames editor={editor} />
        <EditorContent editor={editor} />
        <SideNotesLayer editor={editor} />
        <NoteLinkHover editor={editor} />
        <GlossaryHover editor={editor} />
        {!learning && <BlockSelection editor={editor} />}
        {!learning && <BlockBar editor={editor} />}
        {!learning && <InlineAtomEditor editor={editor} />}
      </div>
      <CodeWorkspaceHost editor={editor} />
    </div>
  );
}
