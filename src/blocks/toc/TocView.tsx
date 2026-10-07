import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEditorTick } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';

interface Heading {
  pos: number;
  level: number;
  text: string;
}

export function TocView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  useEditorTick(editor);
  const bar = useBlockBar(editor, getPos);
  const depth = node.attrs.depth as number;

  const headings: Heading[] = [];
  editor.state.doc.descendants((n, pos) => {
    if (n.type.name === 'heading' && n.attrs.level <= depth && n.textContent.trim()) headings.push({ pos, level: n.attrs.level, text: n.textContent });
    // Überschriften in Spalten und Callouts zählen mit, in Tabellen o. Ä. gibt es keine.
    return !n.isTextblock;
  });
  // Beginnt die Notiz erst mit H2, rückt die oberste vorhandene Ebene ganz nach links.
  const top = Math.min(...headings.map((h) => h.level), 3);

  function jump(h: Heading) {
    const dom = editor.view.nodeDOM(h.pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <NodeViewWrapper className={`b-toc${bar.active ? ' is-selected' : ''}`} contentEditable={false} data-interactive="">
      {bar.render(
        <>
          {[1, 2, 3].map((d) => (
            <BarButton key={d} icon={d === 1 ? 'heading' : d === 2 ? 'heading2' : 'heading3'} label={`Bis Ebene ${d}`} text={`H${d}`} active={depth === d} onClick={() => updateAttributes({ depth: d })} />
          ))}
        </>,
      )}
      <p className="b-toc-label">Inhalt</p>
      {headings.length === 0 ? (
        <p className="b-toc-empty">Noch keine Überschriften in dieser Notiz.</p>
      ) : (
        <nav aria-label="Inhaltsverzeichnis">
          {headings.map((h) => (
            <a
              key={h.pos}
              href="#"
              className={`b-toc-item is-l${h.level - top + 1}`}
              onClick={(e) => {
                e.preventDefault();
                jump(h);
              }}
            >
              {h.text}
            </a>
          ))}
        </nav>
      )}
    </NodeViewWrapper>
  );
}
