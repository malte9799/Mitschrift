import { Fragment } from '@tiptap/pm/model';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { BarButton, BarSep, useBlockBar } from '../BlockBar';
import { MAX_COLUMNS, type ColumnsLayout } from './Columns';

const layouts: { id: ColumnsLayout; label: string }[] = [
  { id: 'equal', label: 'Gleich breit' },
  { id: 'wide-left', label: 'Links breiter' },
  { id: 'wide-right', label: 'Rechts breiter' },
];

export function ColumnsView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const count = node.childCount;
  const layout = (count === 2 ? node.attrs.layout : 'equal') as ColumnsLayout;

  function addColumn() {
    const pos = getPos();
    if (typeof pos !== 'number' || count >= MAX_COLUMNS) return;
    const end = pos + node.nodeSize - 1;
    editor.chain().focus().insertContentAt(end, { type: 'column', content: [{ type: 'paragraph' }] }).setTextSelection(end + 2).run();
  }

  /** Letzte Spalte entfernen; ihr Inhalt wandert ans Ende der Spalte davor. */
  function removeColumn() {
    const pos = getPos();
    if (typeof pos !== 'number' || count <= 2) return;
    const last = node.lastChild!;
    const lastStart = pos + node.nodeSize - 1 - last.nodeSize;
    const empty = last.childCount === 1 && last.firstChild!.isTextblock && last.firstChild!.content.size === 0;
    const tr = editor.state.tr.delete(lastStart, lastStart + last.nodeSize);
    // lastStart - 1: Position am Ende der vorherigen Spalte (vor deren schließendem Token).
    if (!empty) tr.insert(lastStart - 1, last.content);
    editor.view.dispatch(tr);
  }

  /** Layout auflösen: Der Inhalt aller Spalten steht danach untereinander. */
  function unwrap() {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    let content = Fragment.empty;
    node.forEach((col) => (content = content.append(col.content)));
    editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, content));
    editor.commands.focus();
  }

  return (
    <NodeViewWrapper className={`cols cols-${count}${bar.active ? ' is-active' : ''}`} data-layout={layout}>
      {bar.render(
        <>
          <BarButton icon="colAdd" label="Spalte hinzufügen" text="Spalte" disabled={count >= MAX_COLUMNS} onClick={addColumn} />
          <BarButton icon="colDel" label="Letzte Spalte entfernen" text="Entfernen" disabled={count <= 2} onClick={removeColumn} />
          {count === 2 && (
            <>
              <BarSep />
              {layouts.map((l) => (
                <BarButton key={l.id} icon={l.id === 'equal' ? 'layoutGrid' : l.id === 'wide-left' ? 'floatLeft' : 'floatRight'} label={l.label} active={layout === l.id} onClick={() => updateAttributes({ layout: l.id })} />
              ))}
            </>
          )}
          <BarSep />
          <BarButton icon="ungroup" label="Spalten auflösen" text="Auflösen" onClick={unwrap} />
        </>,
      )}
      <NodeViewContent className="cols-grid" />
    </NodeViewWrapper>
  );
}
