import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface BlockSelectionProps {
  editor: Editor;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Rubber-Band-Auswahl über mehrere Top-Level-Blöcke hinweg, analog zum Desktop-Editor:
 * Ziehen in einem leeren Bereich zieht eine Box auf, die alle überstrichenen Blöcke
 * visuell markiert. ⌘C kopiert den Inhalt der markierten Blöcke, per Maus lässt sich
 * die ganze Gruppe an eine andere Stelle ziehen. Rein visuell/DOM-basiert, keine
 * ProseMirror-Selektion.
 */
export function BlockSelection({ editor }: BlockSelectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);
  const draggingGroupRef = useRef(false);
  const dropIndicatorRef = useRef<HTMLDivElement>(null);

  function getBlocks(): { pos: number; el: HTMLElement }[] {
    const dom = editor.view.dom as HTMLElement;
    const blocks: { pos: number; el: HTMLElement }[] = [];
    editor.state.doc.forEach((_node, offset) => {
      const el = editor.view.nodeDOM(offset) as HTMLElement | null;
      if (el && el.nodeType === 1 && el.parentElement === dom) {
        blocks.push({ pos: offset, el });
      }
    });
    return blocks;
  }

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    const container = dom.parentElement;
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let dragging = false;

    function toLocal(clientX: number, clientY: number) {
      const rect = container!.getBoundingClientRect();
      return { x: clientX - rect.left + container!.scrollLeft, y: clientY - rect.top + container!.scrollTop };
    }

    /** Prüft, ob der Klick tatsächlich auf gerendertem Inhalt liegt (nicht nur im Block-Rechteck daneben). */
    function isOnRenderedContent(clientX: number, clientY: number): boolean {
      const docWithCaret = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      };
      let node: Node | null = null;
      let rect: DOMRect | null = null;
      if (docWithCaret.caretRangeFromPoint) {
        const range = docWithCaret.caretRangeFromPoint(clientX, clientY);
        if (range) {
          node = range.startContainer;
          rect = range.getBoundingClientRect();
        }
      } else if (docWithCaret.caretPositionFromPoint) {
        const pos = docWithCaret.caretPositionFromPoint(clientX, clientY);
        if (pos) {
          node = pos.offsetNode;
          const r = document.createRange();
          r.setStart(pos.offsetNode, pos.offset);
          r.setEnd(pos.offsetNode, pos.offset);
          rect = r.getBoundingClientRect();
        }
      }
      if (!node || !dom.contains(node)) return false;
      // Leere Zeilen/Absätze: Klick zählt als Inhalt, sonst könnte man sie nicht anklicken.
      if (node.nodeType === 1 && (node as HTMLElement).matches('p,h1,h2,h3,li,blockquote,pre')) {
        return (node.textContent ?? '').trim().length === 0;
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) return true;
      const withinLine = clientY >= rect.top - 2 && clientY <= rect.bottom + 2;
      const withinReach = clientX <= rect.right + 24;
      return withinLine && withinReach;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      // Interaktive Blöcke (Eingabefelder, Buttons) und Menüs nie mit der Box überlagern.
      if (e.target instanceof Element && e.target.closest('input,textarea,button,select,[data-interactive],.c-editor-draghandle,.c-insert-menu')) return;
      // Klick auf tatsächlichen Text: native Textauswahl übernimmt, keine Box.
      if (isOnRenderedContent(e.clientX, e.clientY)) {
        if (selectedPositions.length > 0) {
          setSelectedPositions([]);
          setDragRect(null);
        }
        return;
      }
      const { x, y } = toLocal(e.clientX, e.clientY);
      startX = x;
      startY = y;
      dragging = true;
      setSelectedPositions([]);
      setDragRect({ left: x, top: y, width: 0, height: 0 });
      e.preventDefault();
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const { x, y } = toLocal(e.clientX, e.clientY);
      const left = Math.min(startX, x);
      const top = Math.min(startY, y);
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      setDragRect({ left, top, width, height });

      const containerRect = container!.getBoundingClientRect();
      const boxTop = containerRect.top - container!.scrollTop + top;
      const boxBottom = boxTop + height;
      const hits: number[] = [];
      for (const { pos, el } of getBlocks()) {
        const r = el.getBoundingClientRect();
        if (r.bottom >= boxTop && r.top <= boxBottom) hits.push(pos);
      }
      setSelectedPositions(hits);
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging = false;
      setDragRect(null);
    }

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editor, selectedPositions.length]);

  // Markierte Blöcke optisch hervorheben.
  useEffect(() => {
    const blocks = getBlocks();
    for (const { pos, el } of blocks) {
      el.classList.toggle('is-block-selected', selectedPositions.includes(pos));
    }
    return () => {
      for (const { el } of blocks) el.classList.remove('is-block-selected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neu berechnet bei jeder Selektionsänderung
  }, [selectedPositions, editor]);

  // ⌘C / Strg+C kopiert den Inhalt der markierten Blöcke, wenn keine native Textauswahl vorliegt.
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      if (selectedPositions.length === 0) return;
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
      const blocks = getBlocks().filter((b) => selectedPositions.includes(b.pos));
      if (blocks.length === 0) return;
      const html = blocks.map((b) => b.el.outerHTML).join('');
      const text = blocks.map((b) => b.el.textContent ?? '').join('\n');
      e.clipboardData?.setData('text/html', html);
      e.clipboardData?.setData('text/plain', text);
      e.preventDefault();
    }
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [selectedPositions, editor]);

  // Escape hebt die Auswahl auf; Entf/Backspace löscht die markierten Blöcke.
  useEffect(() => {
    if (selectedPositions.length === 0) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedPositions([]);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active as HTMLElement).isContentEditable) return;
        const { state } = editor.view;
        const blocks = getBlocks().filter((b) => selectedPositions.includes(b.pos)).sort((a, b) => b.pos - a.pos);
        let tr = state.tr;
        for (const b of blocks) {
          const mapped = tr.mapping.map(b.pos);
          const node = tr.doc.nodeAt(mapped);
          if (!node) continue;
          tr = tr.delete(mapped, mapped + node.nodeSize);
        }
        editor.view.dispatch(tr);
        setSelectedPositions([]);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, selectedPositions]);

  // Die markierte Gruppe per Maus an eine andere Stelle ziehen.
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    if (selectedPositions.length === 0) return;

    let dragStarted = false;
    let startEl: HTMLElement | null = null;
    let startClientX = 0;
    let startClientY = 0;
    const DRAG_THRESHOLD = 4;

    function findBlockEl(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof Node)) return null;
      for (const { el } of getBlocks()) {
        if (el.contains(target)) return el;
      }
      return null;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      const blockEl = findBlockEl(e.target);
      if (!blockEl || !blockEl.classList.contains('is-block-selected')) return;
      // Auf einem markierten Block: Verschieben statt Rubber-Band-Neustart/Textauswahl.
      e.stopPropagation();
      e.preventDefault();
      startEl = blockEl;
      startClientX = e.clientX;
      startClientY = e.clientY;
      dragStarted = false;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
      if (!startEl) return;
      if (!dragStarted) {
        const dx = e.clientX - startClientX;
        const dy = e.clientY - startClientY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragStarted = true;
        draggingGroupRef.current = true;
        document.body.classList.add('is-dragging-blocks');
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      let overEl: HTMLElement | null = null;
      for (const { el } of getBlocks()) {
        if (target && el.contains(target)) {
          overEl = el;
          break;
        }
      }
      const indicator = dropIndicatorRef.current;
      if (!indicator) return;
      if (!overEl || overEl.classList.contains('is-block-selected')) {
        indicator.style.display = 'none';
        return;
      }
      const r = overEl.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      indicator.style.display = 'block';
      indicator.style.left = `${r.left}px`;
      indicator.style.width = `${r.width}px`;
      indicator.style.top = `${before ? r.top : r.bottom}px`;
    }

    function onMouseUp(e: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const indicator = dropIndicatorRef.current;
      const wasDragging = dragStarted;
      dragStarted = false;
      startEl = null;
      draggingGroupRef.current = false;
      document.body.classList.remove('is-dragging-blocks');
      if (indicator) indicator.style.display = 'none';
      if (!wasDragging) {
        // Einfacher Klick auf einen markierten Block ohne Ziehen: Auswahl aufheben, Cursor setzen.
        const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        setSelectedPositions([]);
        if (coords) editor.chain().focus().setTextSelection(coords.pos).run();
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      let overEl: HTMLElement | null = null;
      for (const { el } of getBlocks()) {
        if (target && el.contains(target)) {
          overEl = el;
          break;
        }
      }
      if (!overEl || overEl.classList.contains('is-block-selected')) return;

      const before = e.clientY < overEl.getBoundingClientRect().top + overEl.getBoundingClientRect().height / 2;

      const blocks = getBlocks();
      const overIndex = blocks.findIndex((b) => b.el === overEl);
      if (overIndex === -1) return;
      const targetPos = blocks[overIndex].pos;

      const { state } = editor.view;
      const selected = blocks.filter((b) => selectedPositions.includes(b.pos)).sort((a, b) => a.pos - b.pos);
      if (selected.length === 0) return;

      const nodes = selected.map((b) => state.doc.nodeAt(b.pos)).filter((n): n is NonNullable<typeof n> => !!n);
      if (nodes.length !== selected.length) return;

      let tr = state.tr;
      // Von hinten nach vorne löschen, damit frühere Positionen stabil bleiben.
      for (let i = selected.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const from = selected[i].pos;
        tr = tr.delete(from, from + node.nodeSize);
      }
      let insertPos = tr.mapping.map(targetPos);
      if (!before) {
        const targetNode = state.doc.nodeAt(targetPos);
        if (targetNode) insertPos = tr.mapping.map(targetPos + targetNode.nodeSize);
      }
      for (const node of nodes) {
        tr = tr.insert(insertPos, node);
        insertPos += node.nodeSize;
      }
      editor.view.dispatch(tr);
      setSelectedPositions([]);
    }

    dom.addEventListener('mousedown', onMouseDown, { capture: true });
    return () => {
      dom.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editor, selectedPositions]);

  return (
    <div ref={containerRef} className="c-block-selection-layer" aria-hidden="true">
      {dragRect && (
        <div
          className="c-block-selection-box"
          style={{
            left: dragRect.left,
            top: dragRect.top,
            width: dragRect.width,
            height: dragRect.height,
          }}
        />
      )}
      <div ref={dropIndicatorRef} className="c-block-selection-drop" style={{ display: 'none' }} />
    </div>
  );
}
