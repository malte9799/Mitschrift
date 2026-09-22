import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';

interface DragHandleProps {
  editor: Editor;
  onInsert: (afterPos: number) => void;
}

const DRAG_TYPE = 'application/x-mitschrift-block';

/** Findet den Top-Level-Block auf Höhe `clientY`. */
function blockAt(editor: Editor, clientY: number): { pos: number; el: HTMLElement } | null {
  const dom = editor.view.dom as HTMLElement;
  const rect = dom.getBoundingClientRect();
  const top = Math.min(Math.max(clientY, rect.top + 1), rect.bottom - 1);
  const coords = editor.view.posAtCoords({ left: rect.left + 24, top });
  if (!coords) return null;
  const p = coords.inside >= 0 ? coords.inside : coords.pos;
  const $p = editor.state.doc.resolve(p);
  const pos = $p.depth === 0 ? p : $p.before(1);
  if (!editor.state.doc.nodeAt(pos)) return null;
  const el = editor.view.nodeDOM(pos);
  if (!(el instanceof HTMLElement)) return null;
  return { pos, el };
}

/**
 * Griff + Plus links neben dem Block unter dem Mauszeiger. Der Griff verschiebt
 * Top-Level-Blöcke per HTML5-Drag&Drop; eine Linie zeigt das Ziel an.
 */
export function DragHandle({ editor, onInsert }: DragHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const hoverPos = useRef<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    // Der ganze Editor-Körper, damit der Griff (links außerhalb des Texts) mit dazugehört.
    const container = (editor.view.dom as HTMLElement).closest<HTMLElement>('.c-editor-body');
    if (!container) return;

    function onMouseMove(e: MouseEvent) {
      const handle = handleRef.current;
      if (!handle || dragFrom.current !== null) return;
      const block = blockAt(editor, e.clientY);
      if (!block) return;
      const blockRect = block.el.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(block.el).lineHeight) || 28;
      const offset = Math.max(0, Math.min(lineHeight, blockRect.height) / 2 - 14);
      handle.style.top = `${blockRect.top - container!.getBoundingClientRect().top + offset}px`;
      handle.classList.add('is-visible');
      hoverPos.current = block.pos;
    }

    function onMouseLeave() {
      if (dragFrom.current === null) handleRef.current?.classList.remove('is-visible');
    }

    function dropTarget(e: DragEvent) {
      const block = blockAt(editor, e.clientY);
      if (!block) return null;
      const r = block.el.getBoundingClientRect();
      return { ...block, before: e.clientY < r.top + r.height / 2, rect: r };
    }

    function onDragOver(e: DragEvent) {
      if (dragFrom.current === null) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const target = dropTarget(e);
      const indicator = indicatorRef.current;
      if (!indicator || !target) return;
      const c = container!.getBoundingClientRect();
      indicator.style.display = 'block';
      indicator.style.left = `${target.rect.left - c.left}px`;
      indicator.style.width = `${target.rect.width}px`;
      indicator.style.top = `${(target.before ? target.rect.top - 4 : target.rect.bottom + 4) - c.top}px`;
    }

    function onDrop(e: DragEvent) {
      const from = dragFrom.current;
      if (from === null) return;
      e.preventDefault();
      e.stopPropagation();
      const target = dropTarget(e);
      cleanup();
      if (!target) return;

      const { state } = editor.view;
      const node = state.doc.nodeAt(from);
      const targetNode = state.doc.nodeAt(target.pos);
      if (!node || !targetNode) return;
      const insertAt = target.before ? target.pos : target.pos + targetNode.nodeSize;
      if (insertAt >= from && insertAt <= from + node.nodeSize) return;

      const tr = state.tr.delete(from, from + node.nodeSize);
      tr.insert(tr.mapping.map(insertAt), node);
      editor.view.dispatch(tr.scrollIntoView());
    }

    function cleanup() {
      dragFrom.current = null;
      if (indicatorRef.current) indicatorRef.current.style.display = 'none';
      document.body.classList.remove('is-dragging-blocks');
      container!.querySelectorAll('.is-drag-source').forEach((el) => el.classList.remove('is-drag-source'));
    }

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('dragover', onDragOver, true);
    container.addEventListener('drop', onDrop, true);
    window.addEventListener('dragend', cleanup);
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('dragover', onDragOver, true);
      container.removeEventListener('drop', onDrop, true);
      window.removeEventListener('dragend', cleanup);
    };
  }, [editor]);

  function onDragStart(e: React.DragEvent) {
    const pos = hoverPos.current;
    if (pos === null) return;
    const el = editor.view.nodeDOM(pos);
    dragFrom.current = pos;
    e.dataTransfer.setData(DRAG_TYPE, String(pos));
    e.dataTransfer.effectAllowed = 'move';
    if (el instanceof HTMLElement) {
      e.dataTransfer.setDragImage(el, 0, 12);
      requestAnimationFrame(() => el.classList.add('is-drag-source'));
    }
    document.body.classList.add('is-dragging-blocks');
  }

  return (
    <>
      <div ref={handleRef} className="c-editor-draghandle">
        <button
          type="button"
          className="c-editor-draghandle-add"
          aria-label="Block einfügen"
          onClick={() => hoverPos.current !== null && onInsert(hoverPos.current)}
        >
          <Icon name="plus" />
        </button>
        <span className="c-editor-draghandle-grip" draggable onDragStart={onDragStart} aria-label="Block verschieben">
          <Icon name="grip" />
        </span>
      </div>
      <div ref={indicatorRef} className="c-editor-drop-indicator" style={{ display: 'none' }} />
    </>
  );
}
