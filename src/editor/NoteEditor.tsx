import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Editor } from '@tiptap/react';
import { noteExtensions } from './extensions';
import { SlashCommand } from './SlashCommand';
import { Toolbar } from './Toolbar';
import { DragHandle } from './DragHandle';
import { BlockSelection } from './BlockSelection';
import { InsertMenu, type InsertMenuHandle } from './InsertMenu';
import { useSnippets } from '@/hooks/useSnippets';
import { TableMenu } from '@/blocks/table/TableMenu';

interface NoteEditorProps {
  content: string;
  onChange: (json: string) => void;
  /** Lernmodus: Editor ist schreibgeschützt, interaktive Blöcke werden zu Übungen. */
  learning: boolean;
  /** Meldet die Tiptap-Editor-Instanz nach oben, z. B. für die Bausteine-Seitenleiste. */
  onEditorReady?: Dispatch<SetStateAction<Editor | null>>;
}

/** Blockbasierter Rich-Text-Editor: Tiptap-Kern + Slash-Menü, Bubble-Toolbar, Drag-Handle. */
export function NoteEditor({ content, onChange, learning, onEditorReady }: NoteEditorProps) {
  const { snippets } = useSnippets();
  const snippetsRef = useRef(snippets);
  snippetsRef.current = snippets;
  const lastJson = useRef(content);

  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [insertTop, setInsertTop] = useState(0);

  const editor = useEditor({
    immediatelyRender: true,
    editable: !learning,
    extensions: [...noteExtensions, SlashCommand.configure({})],
    content: content ? JSON.parse(content) : '',
    // Über create/destroy melden statt per Effect: StrictMode erzeugt die Instanz
    // doppelt, ein Effect konnte sonst die bereits zerstörte Instanz nach oben geben.
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
      editor.on('destroy', () => onEditorReady?.((cur) => (cur === editor ? null : cur)));
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
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
    if (!editor || editor.isEditable === !learning) return;
    editor.setEditable(!learning);
    setInsertAt(null);
  }, [editor, learning]);

  useEffect(() => {
    if (insertAt === null) return;
    const close = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.c-insert-menu')) setInsertAt(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [insertAt]);

  if (!editor) return null;

  const insertHandle: InsertMenuHandle | null =
    insertAt !== null
      ? {
          editor,
          query: '',
          apply: (run) => {
            const node = editor.state.doc.nodeAt(insertAt);
            // Hinter dem Block eine leere Zeile anlegen und dort einfügen.
            const after = insertAt + (node?.nodeSize ?? 0);
            editor.chain().focus().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run();
            run(editor);
            setInsertAt(null);
          },
        }
      : null;

  return (
    <div className={`c-editor${learning ? ' is-learning' : ''}`}>
      {!learning && <Toolbar editor={editor} />}
      <div className="c-editor-body">
        {!learning && <DragHandle
            editor={editor}
            onInsert={(pos) => {
              const el = editor.view.nodeDOM(pos);
              const body = (editor.view.dom as HTMLElement).closest('.c-editor-body');
              if (el instanceof HTMLElement && body) {
                setInsertTop(el.getBoundingClientRect().bottom - body.getBoundingClientRect().top + 6);
              }
              setInsertAt(pos);
            }}
          />}
        <EditorContent editor={editor} />
        {!learning && <BlockSelection editor={editor} />}
        {!learning && <TableMenu editor={editor} />}
        {insertHandle && (
          <div className="c-insert-menu-inline" style={{ top: insertTop }}>
            <InsertMenu handle={insertHandle} snippets={snippets} onClose={() => setInsertAt(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
