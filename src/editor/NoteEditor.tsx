import { useEditor, EditorContent } from '@tiptap/react';
import type { Schema } from '@tiptap/pm/model';
import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Editor } from '@tiptap/react';
import { noteExtensions } from './extensions';
import { SlashCommand } from './SlashCommand';
import { NoteLink } from './NoteLink';
import { NoteLinkHover } from './noteBlock/NoteLinkHover';
import { SmartLinkHover } from './smartLink/SmartLinkHover';
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

/**
 * Gespeicherten Inhalt lesen. Ist er kein gültiges JSON (z. B. von Hand bearbeitete Datei),
 * wird er als Text angezeigt statt die Notiz unbenutzbar zu machen – so geht nichts verloren.
 */
function parseContent(content: string) {
  if (!content) return null;
  try {
    const doc = JSON.parse(content);
    if (doc && typeof doc === 'object' && doc.type === 'doc') return doc;
  } catch {
    /* unten als Text */
  }
  return {
    type: 'doc',
    content: content.split(/\n/).map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
  };
}

interface JsonNode {
  type?: string;
  content?: JsonNode[];
  marks?: { type?: string }[];
}

/** Block- und Formatierungstypen im JSON, die das Schema nicht kennt. */
function unknownTypes(doc: JsonNode | null, schema: Schema): string[] {
  const found = new Set<string>();
  const walk = (n: JsonNode) => {
    if (n.type && !schema.nodes[n.type]) found.add(n.type);
    for (const m of n.marks ?? []) if (m.type && !schema.marks[m.type]) found.add(m.type);
    n.content?.forEach(walk);
  };
  if (doc) walk(doc);
  return [...found];
}

/** Ruhezeit nach der letzten Änderung, bevor das Dokument serialisiert und gemeldet wird. */
const SERIALIZE_DELAY = 300;

/** Blockbasierter Rich-Text-Editor: Tiptap-Kern + Slash-Menü, Bubble-Toolbar, Drag-Handle. */
export function NoteEditor({ noteId, content, onChange, learning, onEditorReady }: NoteEditorProps) {
  const { snippets } = useSnippets();
  const snippetsRef = useRef(snippets);
  snippetsRef.current = snippets;
  const lastJson = useRef(content);
  // Randnotizen stehen im selben JSON wie der Text (Feld `sideNotes`), damit Anker und Inhalt zusammen gespeichert werden.
  const [initial] = useState(() => parseContent(content));
  /**
   * Gespeicherter Inhalt enthält Blöcke, die dieser Editor nicht kennt (z. B. aus einer neueren
   * Version oder von Hand bearbeitet). Dann nur lesen und nie speichern – sonst würden die
   * unbekannten Teile beim ersten Tastendruck überschrieben.
   */
  const contentError = useRef(false);
  const [locked, setLocked] = useState(false);
  // Serialisierung (getJSON + stringify über das ganze Dokument) ist teuer: pro Transaktion nur „dirty“ merken,
  // erst nach kurzer Ruhe, beim Verlassen oder wenn der Tab verborgen wird tatsächlich bauen.
  const dirty = useRef(false);
  const serializeTimer = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /** Gibt eine ausstehende Änderung sofort per `onChange` ab. Gesperrte Notizen speichern nie. */
  const flushChange = useRef(() => {
    clearTimeout(serializeTimer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed || contentError.current) return;
    const sideNotes = getSideNotes(ed.state);
    const json = JSON.stringify(sideNotes.length ? { ...ed.getJSON(), sideNotes } : ed.getJSON());
    if (json === lastJson.current) return;
    lastJson.current = json;
    onChangeRef.current(json);
  }).current;

  const editor = useEditor({
    immediatelyRender: true,
    editable: !learning,
    extensions: [...noteExtensions, SideNotes.configure({ initial: parseSideNotes(initial?.sideNotes) }), SlashCommand.configure({}), NoteLink],
    content: initial ?? '',
    enableContentCheck: true,
    onContentError: ({ editor, error }) => {
      // Nur der gespeicherte Startinhalt zählt; spätere ungültige Einfügungen lehnt Tiptap selbst ab.
      if (editor.isInitialized) return;
      // Kleinigkeiten (z. B. leere Textknoten) repariert Tiptap verlustfrei. Sperren nur, wenn Block-
      // oder Formatierungstypen fehlen – die gingen beim nächsten Speichern verloren.
      const unknown = unknownTypes(initial, editor.schema);
      if (!unknown.length) return;
      console.error(`Mitschrift: Notiz enthält unbekannte Typen (${unknown.join(', ')})`, error);
      contentError.current = true;
      queueMicrotask(() => setLocked(true));
    },
    // Über create/destroy melden statt per Effect: StrictMode erzeugt die Instanz
    // doppelt, ein Effect konnte sonst die bereits zerstörte Instanz nach oben geben.
    onCreate: ({ editor }) => {
      editorRef.current = editor;
      onEditorReady?.(editor);
      editor.on('destroy', () => onEditorReady?.((cur) => (cur === editor ? null : cur)));
    },
    // Statt onUpdate: Auch reine Randnotiz-Änderungen (ohne Text-Änderung) sollen speichern.
    onTransaction: ({ editor, transaction }) => {
      if (contentError.current) return;
      if ((!transaction.docChanged && !transaction.getMeta(sideNotesKey)) || transaction.getMeta('preventUpdate')) return;
      editorRef.current = editor;
      dirty.current = true;
      clearTimeout(serializeTimer.current);
      serializeTimer.current = setTimeout(flushChange, SERIALIZE_DELAY);
    },
  });

  // Nichts verlieren: Beim Unmount (Layout-Cleanup läuft vor dem Flush von useNote) sowie bei verborgenem Tab
  // oder Schließen die ausstehende Änderung sofort abgeben. Capture, damit wir vor den Listenern von useNote dran sind.
  useLayoutEffect(() => {
    const onVisibility = () => document.visibilityState === 'hidden' && flushChange();
    document.addEventListener('visibilitychange', onVisibility, true);
    window.addEventListener('pagehide', flushChange, true);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility, true);
      window.removeEventListener('pagehide', flushChange, true);
      flushChange();
    };
  }, [flushChange]);

  useEffect(() => {
    if (!editor) return;
    editor.storage.slashCommand.getSnippets = () => snippetsRef.current;
  }, [editor, snippets]);

  useEffect(() => {
    if (editor) editor.storage.noteLink.currentId = noteId ?? null;
  }, [editor, noteId]);

  useEffect(() => {
    const editable = !learning && !locked;
    if (!editor || editor.isEditable === editable) return;
    editor.setEditable(editable);
  }, [editor, learning, locked]);

  if (!editor) return null;

  return (
    <div className={`c-editor${learning ? ' is-learning' : ''}`}>
      {locked && (
        <p className="c-editor-locked" role="alert">
          Diese Notiz enthält Inhalte, die Mitschrift nicht darstellen kann. Bearbeiten ist gesperrt, damit nichts überschrieben wird.
        </p>
      )}
      {!learning && !locked && <Toolbar editor={editor} />}
      <div className="c-editor-body">
        {!learning && <DragHandle editor={editor} />}
        <PageFrames editor={editor} />
        <EditorContent editor={editor} />
        <SideNotesLayer editor={editor} />
        <NoteLinkHover editor={editor} />
        <SmartLinkHover editor={editor} />
        <GlossaryHover editor={editor} />
        {!learning && <BlockSelection editor={editor} />}
        {!learning && <BlockBar editor={editor} />}
        {!learning && <InlineAtomEditor editor={editor} />}
      </div>
      <CodeWorkspaceHost editor={editor} />
    </div>
  );
}
