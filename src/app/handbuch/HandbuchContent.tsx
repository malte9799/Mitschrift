import { useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useNavigate } from 'react-router-dom';
import { noteExtensions } from '@/editor/extensions';
import { GlossaryHover } from '@/glossary/GlossaryHover';

/**
 * Handbuch-Seiten als schreibgeschützter Editor – Karteikarten, Quiz, Plotter & Co. bleiben so
 * bedienbar (wie im Präsentationsmodus, siehe `Presentation.tsx`), ohne dass etwas gespeichert wird.
 */
export function HandbuchContent({ doc }: { doc: object }) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const editor = useEditor(
    {
      editable: false,
      immediatelyRender: true,
      extensions: noteExtensions,
      content: doc,
    },
    [doc],
  );

  // Interne Handbuch-Links (/handbuch/…) clientseitig öffnen statt vollem Seiten-Reload.
  function onClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest?.('a[href^="/handbuch"]');
    const href = a?.getAttribute('href');
    if (!href) return;
    e.preventDefault();
    navigate(href);
  }

  if (!editor) return null;
  return (
    <div ref={rootRef} className="c-editor is-learning handbuch-content" onClick={onClick}>
      <div className="c-editor-body">
        <EditorContent editor={editor} />
      </div>
      <GlossaryHover editor={editor} />
    </div>
  );
}
