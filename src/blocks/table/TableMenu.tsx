import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { useEditorTick } from '@/editor/useEditable';
import { BarButton, BarSep } from '@/editor/BlockBar';
import { getBlockSelection, setBlockSelection } from '@/editor/BlockSelection';

interface TableOptionsProps {
  editor: Editor;
  /** Position der Tabelle im Dokument. */
  pos: number;
  /** Cursor steht in einer Zelle – dann Zeilen-/Spalten-Aktionen dort, sonst für die ganze Tabelle. */
  inCell: boolean;
}

/** Position im ersten bzw. letzten Feld der Tabelle. */
function cellInside(table: PMNode, pos: number, last: boolean): number {
  const row = last ? table.lastChild! : table.firstChild!;
  const rowPos = pos + 1 + (last ? table.content.size - row.nodeSize : 0);
  const cell = last ? row.lastChild! : row.firstChild!;
  return rowPos + 1 + (last ? row.content.size - cell.nodeSize : 0) + 1;
}

/** Optionen der Tabelle in der Block-Leiste: je nachdem, ob die Tabelle markiert ist oder der Cursor in einer Zelle steht. */
export function TableOptions({ editor, pos, inCell }: TableOptionsProps) {
  useEditorTick(editor);

  /** Befehl an der ersten/letzten Zelle ausführen, die Tabelle bleibt markiert. */
  function atCell(last: boolean, run: (e: Editor) => void) {
    const table = editor.state.doc.nodeAt(pos);
    if (!table) return;
    const marked = getBlockSelection(editor.state).length > 0;
    const inside = cellInside(table, pos, last);
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(inside))));
    run(editor);
    if (marked) setBlockSelection(editor, [pos], true);
  }

  if (!inCell) {
    return (
      <div className="c-block-bar-group">
        <BarButton icon="rowAdd" label="Zeile anhängen" text="Zeile" onClick={() => atCell(true, (e) => e.chain().addRowAfter().run())} />
        <BarButton icon="colAdd" label="Spalte anhängen" text="Spalte" onClick={() => atCell(true, (e) => e.chain().addColumnAfter().run())} />
        <BarSep />
        <BarButton icon="headerRow" label="Kopfzeile an/aus" onClick={() => atCell(false, (e) => e.chain().toggleHeaderRow().run())} />
      </div>
    );
  }

  const run = (fn: (e: Editor) => boolean) => () => fn(editor);
  return (
    <div className="c-block-bar-group">
      <BarButton icon="rowAdd" label="Zeile darunter" onClick={run((e) => e.chain().focus().addRowAfter().run())} />
      <BarButton icon="colAdd" label="Spalte rechts" onClick={run((e) => e.chain().focus().addColumnAfter().run())} />
      <BarSep />
      <BarButton icon="rowDel" label="Zeile löschen" onClick={run((e) => e.chain().focus().deleteRow().run())} />
      <BarButton icon="colDel" label="Spalte löschen" onClick={run((e) => e.chain().focus().deleteColumn().run())} />
      {(editor.can().mergeCells() || editor.can().splitCell()) && (
        <>
          <BarSep />
          {editor.can().mergeCells() ? (
            <BarButton icon="layoutGrid" label="Zellen verbinden" text="Verbinden" onClick={run((e) => e.chain().focus().mergeCells().run())} />
          ) : (
            <BarButton icon="layoutGrid" label="Zelle teilen" text="Teilen" onClick={run((e) => e.chain().focus().splitCell().run())} />
          )}
        </>
      )}
      <BarSep />
      <BarButton icon="headerRow" label="Kopfzeile an/aus" onClick={run((e) => e.chain().focus().toggleHeaderRow().run())} />
    </div>
  );
}
