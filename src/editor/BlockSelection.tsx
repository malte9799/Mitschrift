import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeSelection, Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import { blockUnits, caretAtUnitEnd, deleteUnits, isListItem, moveUnits, outermostCount, unitAt, unitRect, withDescendants } from './blockUnits';

const selectionKey = new PluginKey<number[]>('blockSelection');

/** Positionen der markierten Block-Einheiten (aufsteigend), leer wenn keine Block-Auswahl. */
export function getBlockSelection(state: EditorState): number[] {
  return selectionKey.getState(state) ?? [];
}

/** Markiert die Blöcke an `positions` und legt die Textauswahl darüber, damit Format-Befehle greifen. */
export function setBlockSelection(editor: Editor, positions: number[]) {
  if (editor.isDestroyed) return;
  const { state } = editor;
  // Unterpunkte gehören zu ihrem Listenpunkt und werden mit markiert.
  const sorted = withDescendants(state.doc, positions);
  const cur = getBlockSelection(state);
  if (cur.length === sorted.length && cur.every((p, i) => p === sorted[i])) return;
  const tr = state.tr.setMeta(selectionKey, sorted);
  const lastNode = sorted.length ? state.doc.nodeAt(sorted[sorted.length - 1]) : null;
  if (lastNode) {
    const end = sorted[sorted.length - 1] + lastNode.nodeSize;
    tr.setSelection(TextSelection.between(state.doc.resolve(sorted[0]), state.doc.resolve(end)));
  }
  editor.view.dispatch(tr);
}

/**
 * Chain für Format-Aktionen: Bei Block-Auswahl ohne Fokus (die Auswahl deckt die Blöcke ab
 * und bleibt bestehen), sonst wie gewohnt mit Fokus auf die Textauswahl.
 */
export function formatChain(editor: Editor) {
  return getBlockSelection(editor.state).length ? editor.chain() : editor.chain().focus();
}

/**
 * Vor dem Einfügen eines Blocks aus der Seitenleiste: Nichts Markiertes ersetzen, sondern
 * dahinter einfügen – bei Block-Auswahl hinter dem letzten markierten Block, bei einem
 * ausgewählten Block (z. B. gerade eingefügtes Diagramm) in einer neuen Zeile danach.
 */
export function prepareBlockInsert(editor: Editor) {
  const sel = getBlockSelection(editor.state);
  if (sel.length) {
    const last = sel[sel.length - 1];
    const node = editor.state.doc.nodeAt(last);
    const tr = editor.state.tr.setMeta(selectionKey, []);
    if (node) tr.setSelection(caretAtUnitEnd(tr.doc, last) ?? TextSelection.near(tr.doc.resolve(last + node.nodeSize), -1));
    editor.view.dispatch(tr);
  }
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    const after = selection.to;
    editor.chain().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run();
  }
}

/**
 * Hält die markierten Blöcke als ProseMirror-Plugin-State und zeichnet sie per Decoration.
 * Klassen direkt am DOM würde ProseMirror als Änderung werten und die Blöcke neu zeichnen.
 * Bei Dokument-Änderungen (z. B. alle markierten Blöcke fett/als Liste) wird die Auswahl
 * auf die betroffenen Blöcke nachgeführt statt verworfen.
 */
function blockSelectionPlugin() {
  return new Plugin<number[]>({
    key: selectionKey,
    state: {
      init: () => [],
      apply: (tr, value) => {
        const meta = tr.getMeta(selectionKey) as number[] | undefined;
        if (meta) return meta;
        if (!tr.docChanged || value.length === 0) return value;
        const lastNode = tr.before.nodeAt(value[value.length - 1]);
        const from = tr.mapping.map(value[0], -1);
        const to = tr.mapping.map(value[value.length - 1] + (lastNode?.nodeSize ?? 0), 1);
        return blockUnits(tr.doc)
          .filter((u) => u.pos >= from && u.pos < to)
          .map((u) => u.pos);
      },
    },
    props: {
      decorations(state) {
        const decos = getBlockSelection(state).flatMap((pos) => {
          const node = state.doc.nodeAt(pos);
          return node ? [Decoration.node(pos, pos + node.nodeSize, { class: 'is-block-selected' })] : [];
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

/** Markierungsfläche: knapp um den Inhalt (inkl. Aufzählungszeichen), oben/unten leicht eingerückt. */
const HL_PAD_X = 10;
const HL_INSET_Y = 2;
/** Blöcke mit Fließtext bekommen eine Fläche, Grafiken und Kästen (Tabelle, Diagramm, Code, Hinweis …) nur einen Rahmen. */
const FILLED_BLOCKS = new Set(['listItem', 'taskItem', 'blockquote', 'toggleBlock', 'horizontalRule']);

type Highlight = { pos: number; top: number; left: number; height: number; width: number; outline: boolean };

function measureHighlight(editor: Editor, pos: number, c: DOMRect): Highlight | null {
  const r = unitRect(editor.view, pos);
  const node = editor.state.doc.nodeAt(pos);
  if (!r || !node || r.height <= 1) return null;
  const filled = (node.isTextblock && node.type.name !== 'codeBlock') || FILLED_BLOCKS.has(node.type.name);
  if (!filled) return { pos, top: r.top - c.top, left: r.left - c.left, height: r.height, width: r.width, outline: true };
  // Normale Listenpunkte: das Aufzählungszeichen steht außerhalb des <li> im Einzug der Liste.
  let left = r.left;
  const el = editor.view.nodeDOM(pos);
  if (el instanceof HTMLElement && el.tagName === 'LI' && el.parentElement?.dataset.type !== 'taskList') {
    left -= parseFloat(getComputedStyle(el.parentElement!).paddingLeft) || 0;
  }
  left -= HL_PAD_X;
  return { pos, top: r.top - c.top + HL_INSET_Y, left: left - c.left, height: r.height - 2 * HL_INSET_Y, width: r.right + HL_PAD_X - left, outline: false };
}

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
 * Ziehen in einem leeren Bereich der Seite (auch Ränder, unter dem Text) zieht eine Box auf, die alle überstrichenen Blöcke
 * markiert. Ein erster Klick auf einen Block markiert ihn ebenfalls. ⌘C kopiert, Entf löscht,
 * Format-Aktionen der Seitenleiste wirken auf alle markierten Blöcke, mehrere lassen sich
 * gemeinsam verschieben.
 */
export function BlockSelection({ editor }: BlockSelectionProps) {
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);
  const selectedRef = useRef(selectedPositions);
  selectedRef.current = selectedPositions;
  const draggingGroupRef = useRef(false);
  const dropIndicatorRef = useRef<HTMLDivElement>(null);

  /** Alle Block-Einheiten (Listenpunkte einzeln) mit ihrem DOM-Element. */
  function getBlocks(): { pos: number; el: HTMLElement }[] {
    return blockUnits(editor.state.doc).flatMap((u) => {
      const el = editor.view.nodeDOM(u.pos);
      return el instanceof HTMLElement ? [{ pos: u.pos, el }] : [];
    });
  }

  /** Innerste Einheit, deren Element das Ziel enthält. */
  function blockAtTarget(t: Node | null): { pos: number; el: HTMLElement } | null {
    if (!t) return null;
    return getBlocks().filter((b) => b.el.contains(t)).pop() ?? null;
  }

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    const THRESHOLD = 4;
    // Start relativ zum Editor gespeichert, damit die Box beim Scrollen am Inhalt „klebt“.
    let start: { x: number; y: number } | null = null;
    let last = { x: 0, y: 0 };
    let active = false;
    let raf = 0;

    /**
     * Was passiert beim Klick hier? `box` = leere Fläche, Box aufziehen; `block` = erster Klick
     * auf einen Block markiert ihn als Ganzes; `null` = normales Verhalten (Cursor, Buttons …).
     */
    function modeAt(e: MouseEvent): { kind: 'box' } | { kind: 'block'; pos: number } | null {
      const t = e.target;
      // Erst beim Klick nachschlagen – beim Mounten hängt der Editor evtl. noch nicht im DOM.
      if (!(t instanceof Element) || !dom.closest('.note-screen')?.contains(t)) return null;
      const control = t.closest('input,textarea,button,select,[data-interactive],.note-bar,.c-editor-draghandle,.c-insert-menu,.c-editor-toolbar,.c-table-menu');
      // Ausnahme Toggle-Titel: verhält sich wie Text – erst markieren, beim zweiten Klick bearbeiten.
      const isToggleTitle = control?.matches('input.b-toggle-summary') && control !== document.activeElement;
      // Blöcke mit data-select-bg (z. B. Sammlung): Klick auf den Hintergrund markiert den Block,
      // Bereiche mit data-no-select-bg (Tabelle) behandeln Klicks selbst.
      const isBlockBg = !!control?.matches('[data-select-bg]') && !t.closest('[data-no-select-bg]');
      if (control && !isToggleTitle && !isBlockBg) return null;
      if (!dom.contains(t) || t === dom) return { kind: 'box' };
      const block = blockAtTarget(t);
      if (!block) return { kind: 'box' };
      // Im Block mit dem Cursor verhält sich der Klick normal – erst dort wird Text bearbeitet.
      const caretBlock = unitAt(editor.state.doc, editor.state.selection.from)?.pos;
      if (editor.view.hasFocus() && caretBlock === block.pos) return null;
      return { kind: 'block', pos: block.pos };
    }

    function scrollParent(): HTMLElement {
      for (let el = dom.parentElement; el; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      }
      return document.scrollingElement as HTMLElement;
    }

    function update() {
      if (!start) return;
      const d = dom.getBoundingClientRect();
      const sx = start.x + d.left;
      const sy = start.y + d.top;
      const rect = {
        left: Math.min(sx, last.x),
        top: Math.min(sy, last.y),
        width: Math.abs(last.x - sx),
        height: Math.abs(last.y - sy),
      };
      setDragRect(rect);
      const hits: number[] = [];
      for (const { pos } of getBlocks()) {
        const r = unitRect(editor.view, pos);
        // Eingeklappte Toggle-Inhalte (Höhe 0) nicht mit der Box erfassen.
        if (r && r.height > 1 && r.bottom >= rect.top && r.top <= rect.top + rect.height) hits.push(pos);
      }
      setBlockSelection(editor, hits);
    }

    /** Am oberen/unteren Fensterrand beim Ziehen automatisch scrollen. */
    function autoScroll() {
      raf = 0;
      if (!active) return;
      const edge = 60;
      const dy = last.y < edge ? -(edge - last.y) / 3 : last.y > window.innerHeight - edge ? (last.y - (window.innerHeight - edge)) / 3 : 0;
      if (dy) {
        scrollParent().scrollBy(0, dy);
        update();
      }
      raf = requestAnimationFrame(autoScroll);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      // Klicks in der rechten Leiste (Format, Einfügen …) lassen die Auswahl stehen.
      if (e.target instanceof Element && e.target.closest('.note-panel')) return;
      const selected = selectedRef.current;
      const clicked = e.target instanceof Node && dom.contains(e.target) ? blockAtTarget(e.target) : null;
      if (clicked && selected.includes(clicked.pos)) {
        // Mehrere markiert: die Gruppe lässt sich verschieben (eigener Handler).
        if (outermostCount(editor.state.doc, selected) > 1) return;
        // Zweiter Klick auf den markierten Block: normal in den Text – Cursor setzen oder Text markieren.
        setBlockSelection(editor, []);
        return;
      }
      const mode = modeAt(e);
      if (!mode) {
        if (selected.length) setBlockSelection(editor, []);
        return;
      }
      const d = dom.getBoundingClientRect();
      start = { x: e.clientX - d.left, y: e.clientY - d.top };
      last = { x: e.clientX, y: e.clientY };
      active = false;
      // Auch Eingabefelder in Blöcken (z. B. Sammlungs-Zelle) verlieren den Fokus.
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== dom && dom.contains(focused)) focused.blur();
      if (mode.kind === 'block') {
        // Erster Klick: ganzen Block markieren statt Cursor setzen.
        dom.blur();
        window.getSelection()?.removeAllRanges();
        setBlockSelection(editor, [mode.pos]);
      } else {
        // Klick neben den Text (Ränder, Lücken): Cursor verschwindet.
        dom.blur();
        window.getSelection()?.removeAllRanges();
        setBlockSelection(editor, []);
      }
      // ProseMirror darf den Klick nicht sehen, sonst setzt es beim Loslassen doch den Cursor.
      if (dom.contains(e.target as Node)) e.stopPropagation();
      // Native Textauswahl verhindern – Box bzw. Block-Auswahl übernimmt.
      e.preventDefault();
    }

    function onMouseMove(e: MouseEvent) {
      if (!start) return;
      last = { x: e.clientX, y: e.clientY };
      if (!active) {
        const d = dom.getBoundingClientRect();
        if (Math.hypot(e.clientX - (start.x + d.left), e.clientY - (start.y + d.top)) < THRESHOLD) return;
        active = true;
        // Fokus aus dem Editor nehmen, damit Entf/⌘C auf die Blöcke wirken.
        dom.blur();
        window.getSelection()?.removeAllRanges();
        raf = requestAnimationFrame(autoScroll);
      }
      update();
    }

    function onMouseUp() {
      if (!start) return;
      start = null;
      active = false;
      cancelAnimationFrame(raf);
      setDragRect(null);
    }

    function onScroll() {
      if (active) update();
    }

    // Capture-Phase: vor ProseMirrors eigenem mousedown-Handler.
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getBlocks liest immer den aktuellen Editor-Stand
  }, [editor]);

  // Plugin registrieren; React-State spiegelt den Plugin-State (für Tastatur/Kopieren/Verschieben).
  useEffect(() => {
    editor.registerPlugin(blockSelectionPlugin());
    const sync = () => {
      const next = getBlockSelection(editor.state);
      setSelectedPositions((cur) => (cur.length === next.length && cur.every((p, i) => p === next[i]) ? cur : next));
    };
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
      if (!editor.isDestroyed) editor.unregisterPlugin(selectionKey);
    };
  }, [editor]);

  // Markierungsflächen: vom Griff (links vom Text) bis zum rechten Rand, auch bei eingerückten
  // Listenpunkten – nur die eigene Zeile, Unterpunkte bekommen eigene Flächen.
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const body = (editor.view.dom as HTMLElement).closest<HTMLElement>('.c-editor-body');
    setLayer(body);
    if (!body || selectedPositions.length === 0) {
      setHighlights([]);
      return;
    }
    const measure = () => {
      const c = body.getBoundingClientRect();
      setHighlights(
        selectedPositions.flatMap((pos) => measureHighlight(editor, pos, c) ?? []),
      );
    };
    measure();
    // Neu vermessen, wenn sich das Layout ändert (Toggle auf-/zuklappen, Bilder laden, Fensterbreite).
    const ro = new ResizeObserver(measure);
    ro.observe(editor.view.dom);
    // Auf-/Zuklappen ändert erst die Klasse, die Höhe folgt animiert – auch Klassenwechsel beobachten.
    const mo = new MutationObserver(measure);
    mo.observe(editor.view.dom, { attributes: true, attributeFilter: ['class'], subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [editor, selectedPositions]);

  // ⌘C / ⌘X kopiert bzw. schneidet die markierten Blöcke aus – als echter ProseMirror-Ausschnitt,
  // damit Listen, Quiz & Co. beim Einfügen wieder als Blöcke ankommen.
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      if (selectedPositions.length === 0) return;
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
      const { doc } = editor.state;
      const units = blockUnits(doc).filter((u) => selectedPositions.includes(u.pos));
      if (units.length === 0) return;
      const from = units[0].pos;
      const to = Math.max(...units.map((u) => u.pos + u.node.nodeSize));
      const { dom, text } = editor.view.serializeForClipboard(doc.slice(from, to));
      e.clipboardData?.setData('text/html', dom.innerHTML);
      e.clipboardData?.setData('text/plain', text);
      e.preventDefault();
      if (e.type === 'cut') {
        editor.view.dispatch(deleteUnits(editor.state.tr, selectedPositions));
        setBlockSelection(editor, []);
      }
    }
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
    };
  }, [selectedPositions, editor]);

  // Seitenweite Tastenkürzel: ⌘A markiert alle Blöcke, ⌘Z/⌘⇧Z gehen immer an den Editor.
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'a') return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      const isField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      const inEditor = !!t && dom.contains(t);
      // Titel, Suche, Tag-Feld: eigenes natives Rückgängig/Alles markieren.
      if (isField && !inEditor) return;
      if (key === 'z') {
        // Auch Felder in Blöcken (Quiz, Karteikarten …) speichern über den Editor – dort gilt dessen Verlauf.
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) editor.commands.redo();
        else editor.commands.undo();
        return;
      }
      if (e.shiftKey || isField) return;
      e.preventDefault();
      e.stopPropagation();
      // Im Codeblock: erst nur den ganzen Code markieren, ein zweites ⌘A dann alle Blöcke.
      const { selection } = editor.state;
      const { $from } = selection;
      if (editor.view.hasFocus() && $from.parent.type.name === 'codeBlock' && selection.$to.parent === $from.parent) {
        const start = $from.start();
        const end = $from.end();
        if (selection.from !== start || selection.to !== end) {
          editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, start, end)));
          return;
        }
      }
      dom.blur();
      window.getSelection()?.removeAllRanges();
      setBlockSelection(editor, blockUnits(editor.state.doc).map((u) => u.pos));
    }
    // Capture-Phase: vor ProseMirrors eigener Tastenbehandlung und vor dem Browser-Standard.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [editor]);

  // Escape hebt die Auswahl auf; Entf/Backspace löscht die markierten Blöcke.
  useEffect(() => {
    if (selectedPositions.length === 0) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setBlockSelection(editor, []);
        return;
      }
      if (e.key === 'Tab' && !(document.activeElement as HTMLElement | null)?.isContentEditable) {
        // Markierte Listenpunkte ein-/ausrücken; die Auswahl wandert mit.
        const first = editor.state.doc.nodeAt(Math.min(...selectedPositions));
        if (!first || !isListItem(first)) return;
        e.preventDefault();
        const type = first.type.name;
        if (e.shiftKey) editor.chain().liftListItem(type).run();
        else editor.chain().sinkListItem(type).run();
        return;
      }
      if (e.key === 'Enter' && !(document.activeElement as HTMLElement | null)?.isContentEditable) {
        // Enter springt in den (ersten) markierten Block, ans Ende seines Texts.
        const caret = caretAtUnitEnd(editor.state.doc, Math.min(...selectedPositions));
        setBlockSelection(editor, []);
        if (caret) editor.view.dispatch(editor.state.tr.setSelection(caret));
        editor.view.focus();
        e.preventDefault();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active as HTMLElement).isContentEditable) return;
        editor.view.dispatch(deleteUnits(editor.state.tr, selectedPositions));
        setBlockSelection(editor, []);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, selectedPositions]);

  // Die markierte Gruppe per Maus an eine andere Stelle ziehen.
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    // Nur bei mehreren eigenständigen Blöcken – ein Block mit Unterpunkten zählt als einer.
    if (outermostCount(editor.state.doc, selectedPositions) < 2) return;

    let dragStarted = false;
    let startEl: HTMLElement | null = null;
    let startClientX = 0;
    let startClientY = 0;
    const DRAG_THRESHOLD = 4;

    /** Einheit unter dem Mauszeiger (ohne markierte), samt ihrer eigenen Fläche. */
    function overUnit(e: MouseEvent) {
      const b = blockAtTarget(document.elementFromPoint(e.clientX, e.clientY));
      if (!b || selectedPositions.includes(b.pos)) return null;
      const r = unitRect(editor.view, b.pos);
      return r ? { pos: b.pos, rect: r, before: e.clientY < r.top + r.height / 2 } : null;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      const block = blockAtTarget(e.target instanceof Node ? e.target : null);
      if (!block || !selectedPositions.includes(block.pos)) return;
      const blockEl = block.el;
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
      const indicator = dropIndicatorRef.current;
      if (!indicator) return;
      const over = overUnit(e);
      if (!over) {
        indicator.style.display = 'none';
        return;
      }
      indicator.style.display = 'block';
      indicator.style.left = `${over.rect.left}px`;
      indicator.style.width = `${over.rect.width}px`;
      indicator.style.top = `${over.before ? over.rect.top : over.rect.bottom}px`;
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
        setBlockSelection(editor, []);
        if (coords) editor.chain().focus().setTextSelection(coords.pos).run();
        return;
      }

      const over = overUnit(e);
      if (!over) return;
      const tr = editor.state.tr;
      if (moveUnits(tr, selectedPositions, over.pos, over.before)) editor.view.dispatch(tr);
      setBlockSelection(editor, []);
    }

    dom.addEventListener('mousedown', onMouseDown, { capture: true });
    return () => {
      dom.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editor, selectedPositions]);

  return (
    <>
      {layer &&
        createPortal(
          highlights.map((h) => (
            <div
              key={h.pos}
              className={`c-block-highlight${h.outline ? ' is-outline' : ''}`}
              style={{ left: h.left, top: h.top, height: h.height, width: h.width }}
            />
          )),
          layer,
        )}
      {createPortal(
        <div className="c-block-selection-layer" aria-hidden="true">
          {dragRect && (
            <div
              className="c-block-selection-box"
              style={{ left: dragRect.left, top: dragRect.top, width: dragRect.width, height: dragRect.height }}
            />
          )}
          <div ref={dropIndicatorRef} className="c-block-selection-drop" style={{ display: 'none' }} />
        </div>,
        document.body,
      )}
    </>
  );
}
