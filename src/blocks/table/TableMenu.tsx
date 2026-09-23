import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';

interface TableMenuProps {
  editor: Editor;
}

const actions: { icon: IconName; label: string; run: (e: Editor) => void; danger?: boolean }[] = [
  { icon: 'rowAdd', label: 'Zeile darunter', run: (e) => e.chain().focus().addRowAfter().run() },
  { icon: 'colAdd', label: 'Spalte rechts', run: (e) => e.chain().focus().addColumnAfter().run() },
  { icon: 'rowDel', label: 'Zeile löschen', run: (e) => e.chain().focus().deleteRow().run() },
  { icon: 'colDel', label: 'Spalte löschen', run: (e) => e.chain().focus().deleteColumn().run() },
  { icon: 'headerRow', label: 'Kopfzeile an/aus', run: (e) => e.chain().focus().toggleHeaderRow().run() },
  { icon: 'trash', label: 'Tabelle löschen', run: (e) => e.chain().focus().deleteTable().run(), danger: true },
];

/** Schwebende Leiste über der Tabelle, in der der Cursor steht. */
export function TableMenu({ editor }: TableMenuProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function update() {
      // Ohne Fokus (Klick neben die Tabelle) bleibt die Auswahl zwar in der Tabelle, die Leiste soll aber weg.
      if (!editor.isEditable || !editor.view.hasFocus() || !editor.isActive('table')) {
        setPos(null);
        return;
      }
      const { node } = editor.view.domAtPos(editor.state.selection.from);
      const el = node instanceof Element ? node : node.parentElement;
      const wrapper = el?.closest('.tableWrapper') ?? el?.closest('table');
      const body = (editor.view.dom as HTMLElement).closest('.c-editor-body');
      if (!wrapper || !body) {
        setPos(null);
        return;
      }
      const r = wrapper.getBoundingClientRect();
      const b = body.getBoundingClientRect();
      // Unter der Tabelle, damit Titel und obere Zeilen frei bleiben.
      setPos({ top: r.bottom - b.top + 8, left: r.left - b.left });
    }
    update();
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    editor.on('blur', update);
    editor.on('focus', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
      editor.off('blur', update);
      editor.off('focus', update);
    };
  }, [editor]);

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          className="c-table-menu"
          style={{ top: pos.top, left: pos.left }}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
        >
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              className={`${a.danger ? 'danger' : ''}${i === 4 || i === 2 ? ' sep' : ''}`}
              title={a.label}
              aria-label={a.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => a.run(editor)}
            >
              <Icon name={a.icon} />
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
