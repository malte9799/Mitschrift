import { useEffect, useId, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { useDarkMode } from '@/hooks/useDarkMode';
import { edgeLabel, edgeLocation, edgeRefOf, idsInLine, nodeIdOf, nodeAt, nodeLabel, nodeSpan, setEdgeLabel, setNodeLabel, type EdgeRef, type Span } from './codeLinks';
import { mermaidToWhiteboard } from './toExcalidraw';

type MermaidApi = typeof import('mermaid').default;

// Mermaid ist groß – erst laden, wenn wirklich ein Mermaid-Block angezeigt wird.
let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

let renderCount = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';

type LabelEdit = {
  target: { kind: 'node'; id: string } | { kind: 'edge'; ref: EdgeRef };
  value: string;
  left: number;
  top: number;
  width: number;
};

const lineOf = (code: string, pos: number) => code.slice(0, pos).split('\n').length - 1;


/** Rendert Mermaid-Code zu SVG; Fehler werden als Meldung statt als Absturz zurückgegeben. */
export async function renderMermaid(code: string, dark: boolean): Promise<{ svg: string } | { error: string }> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    // Mermaid 12 nimmt sonst „neo“ – mit Verlauf am Rand und Schlagschatten.
    look: 'classic',
    theme: dark ? 'dark' : 'neutral',
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--sans').trim() || 'system-ui',
  });
  try {
    const { svg } = await mermaid.render(`mermaid-${++renderCount}`, code);
    return { svg };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export function MermaidView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const code = node.attrs.code as string;
  const [editing, setEditing] = useState(() => !code.trim());
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [converting, setConverting] = useState(false);
  const dark = useDarkMode();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Lokaler Entwurf: Das Attribut kommt asynchron per Transaktion zurück – direkt gebunden
  // würde React den Wert überschreiben und den Cursor ans Ende setzen.
  const [draft, setDraft] = useState(code);
  useEffect(() => {
    if (document.activeElement !== textareaRef.current) setDraft(code);
  }, [code]);

  function setCode(next: string) {
    setDraft(next);
    updateAttributes({ code: next });
  }

  // Verknüpfung Code ↔ Diagramm – nur solange der Code-Editor offen ist.
  const linking = editable && editing;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<Span | null>(null);
  const [labelEdit, setLabelEdit] = useState<LabelEdit | null>(null);
  const caretLine = caret && lineOf(draft, caret.start);

  function trackCaret(el: HTMLTextAreaElement) {
    const { selectionStart: start, selectionEnd: end } = el;
    setCaret((c) => (c?.start === start && c.end === end ? c : { start, end }));
  }

  function knownIds() {
    const nodes = [...(canvasRef.current?.querySelectorAll('g.node') ?? [])];
    return new Set(nodes.map(nodeIdOf).filter((id): id is string => !!id));
  }

  // Hilfen im Diagramm: Variablen-Namen an den Knoten und breitere Klickflächen für Pfeile.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.querySelectorAll('.b-node-var, .b-edge-hit').forEach((el) => el.remove());
    if (!linking) return;
    // Das SVG wird verkleinert dargestellt – Schrift so wählen, dass sie am Bildschirm ~10px hat.
    const svgEl = canvas.querySelector('svg');
    const scale = svgEl ? svgEl.getBoundingClientRect().width / (svgEl.viewBox.baseVal?.width || svgEl.getBoundingClientRect().width) : 1;
    const size = 10 / (scale || 1);
    for (const node of canvas.querySelectorAll<SVGGElement>('g.node')) {
      const id = nodeIdOf(node);
      if (!id || nodeLabel(draft, id) === id) continue;
      const box = node.getBBox();
      const tag = document.createElementNS(SVG_NS, 'text');
      tag.setAttribute('class', 'b-node-var');
      tag.setAttribute('x', String(box.x + size * 0.5));
      tag.setAttribute('y', String(box.y + size * 1.1));
      tag.setAttribute('font-size', String(size));
      tag.textContent = id;
      node.append(tag);
    }
    for (const path of canvas.querySelectorAll('path[data-id^="L_"]')) {
      const hit = path.cloneNode(false) as SVGPathElement;
      for (const attr of ['id', 'class', 'style', 'marker-start', 'marker-end']) hit.removeAttribute(attr);
      hit.setAttribute('class', 'b-edge-hit');
      path.before(hit);
    }
  }, [svg, draft, linking]);

  // Knoten und Kanten der Cursor-Zeile hervorheben – das Element am Cursor (bzw. in der Auswahl) stärker.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.querySelectorAll('.is-linked, .is-focused').forEach((el) => el.classList.remove('is-linked', 'is-focused'));
    if (!linking || !caret || caretLine === null) return;
    const known = knownIds();
    const ids = idsInLine(draft, caretLine, known);
    if (!ids.size) return;
    const focusedNode = nodeAt(draft, caret.start, ids);
    for (const el of canvas.querySelectorAll('g.node')) {
      const id = nodeIdOf(el) ?? '';
      if (ids.has(id)) el.classList.add(id === focusedNode ? 'is-focused' : 'is-linked');
    }
    for (const edge of canvas.querySelectorAll('path[data-id^="L_"]:not(.b-edge-hit)')) {
      const eid = edge.getAttribute('data-id')!;
      const ref = edgeRefOf(eid, known);
      const loc = ref && ids.has(ref.from) && ids.has(ref.to) && edgeLocation(draft, ref);
      if (!loc || lineOf(draft, loc.pos) !== caretLine) continue;
      const cls = !focusedNode && caret.start >= loc.pos && caret.start <= loc.end ? 'is-focused' : 'is-linked';
      edge.classList.add(cls);
      canvas.querySelector(`.edgeLabel .label[data-id="${CSS.escape(eid)}"]`)?.closest('.edgeLabel')?.classList.add(cls);
    }
  }, [svg, draft, caret, caretLine, linking]);

  useEffect(() => {
    if (!linking) setLabelEdit(null);
  }, [linking]);

  /** Markiert den Ausdruck im Code (z. B. `A[Licht]`) und scrollt ihn sichtbar. */
  function selectInCode({ start, end }: Span) {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    trackCaret(el);
  }

  /** Öffnet das Eingabefeld über einem Text im Diagramm. */
  function openLabelEdit(target: LabelEdit['target'], value: string, anchor: Element, textBox: Element, span: Span) {
    const base = canvasRef.current!.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const t = textBox.getBoundingClientRect();
    const width = Math.max(a.width, 90);
    setCaret(span);
    setLabelEdit({ target, value, left: a.left - base.left + a.width / 2 - width / 2, top: t.top - base.top + t.height / 2, width });
  }

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!linking) return;
    const target = e.target as Element;

    const node = target.closest('g.node');
    const id = node && nodeIdOf(node);
    if (node && id) {
      const span = nodeSpan(draft, id);
      if (!span) return;
      // Klick auf den Text: Label direkt im Diagramm bearbeiten, sonst den Ausdruck im Code markieren.
      const label = target.closest('.label, .nodeLabel, text:not(.b-node-var)');
      if (label && node.contains(label)) openLabelEdit({ kind: 'node', id }, nodeLabel(draft, id), node, node.querySelector('.label') ?? label, span);
      else selectInCode(span);
      return;
    }

    // Pfeil oder Pfeiltext – beide tragen die Kanten-ID als data-id.
    const edgeEl = target.closest('[data-id^="L_"]');
    const ref = edgeEl && edgeRefOf(edgeEl.getAttribute('data-id')!, knownIds());
    const loc = ref && edgeLocation(draft, ref);
    if (!ref || !loc) return;
    const label = target.closest('.edgeLabel');
    const span = { start: loc.pos, end: loc.end };
    if (label && edgeEl.matches('.label')) openLabelEdit({ kind: 'edge', ref }, edgeLabel(draft, ref), label, edgeEl, span);
    else selectInCode(span);
  }

  function commitLabel() {
    if (!labelEdit) return;
    const text = labelEdit.value.trim();
    const { target } = labelEdit;
    if (target.kind === 'node') {
      if (text && text !== nodeLabel(draft, target.id)) setCode(setNodeLabel(draft, target.id, text));
    } else if (text !== edgeLabel(draft, target.ref)) {
      setCode(setEdgeLabel(draft, target.ref, text));
    }
    setLabelEdit(null);
  }

  // Beim Tippen kurz warten, damit nicht jeder Tastendruck neu rendert.
  useEffect(() => {
    if (!code.trim()) {
      setSvg('');
      setError('');
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const result = await renderMermaid(code, dark);
      if (cancelled) return;
      if ('svg' in result) {
        setSvg(result.svg);
        setError('');
      } else {
        // Letztes gültiges Diagramm stehen lassen, nur den Fehler zeigen.
        setError(result.error);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [code, dark]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab rückt ein statt den Fokus zu wechseln.
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      setCode(draft.slice(0, s) + '  ' + draft.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
    if (e.key === 'Escape') setEditing(false);
  }

  /** Wandelt das Diagramm in eine Excalidraw-Zeichnung um und fügt sie als neuen Whiteboard-Block danach ein. */
  async function convertToWhiteboard() {
    const pos = getPos();
    if (typeof pos !== 'number' || !code.trim() || converting) return;
    setConverting(true);
    try {
      const { scene, svg } = await mermaidToWhiteboard(code);
      editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'whiteboard', attrs: { scene, svg } }).run();
    } catch (err) {
      setError(`Konnte nicht in Excalidraw umgewandelt werden: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setConverting(false);
    }
  }

  return (
    <NodeViewWrapper className="b-block b-mermaid" data-interactive="">
      {bar.render(
        <>
          <BarButton icon={editing ? 'check' : 'pencil'} label={editing ? 'Fertig' : 'Mermaid-Code bearbeiten'} text={editing ? 'Fertig' : 'Code'} active={editing} onClick={() => setEditing((v) => !v)} />
          <BarButton
            icon="whiteboard"
            label="Als Excalidraw-Whiteboard einfügen"
            text={converting ? 'Wird umgewandelt …' : 'Whiteboard'}
            disabled={!code.trim() || converting}
            onClick={convertToWhiteboard}
          />
        </>,
      )}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="mermaid" /> Mermaid
          </span>
        </div>

        <AnimatePresence initial={false}>
          {editable && editing && (
            <motion.div className="b-mermaid-editor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <label htmlFor={textareaId} className="b-mermaid-hint">
                Mermaid-Code – z. B. <code>flowchart</code>, <code>sequenceDiagram</code>, <code>mindmap</code>.{' '}
                <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer">
                  Syntax
                </a>
              </label>
              <textarea
                id={textareaId}
                ref={textareaRef}
                value={draft}
                spellCheck={false}
                rows={Math.min(16, Math.max(4, draft.split('\n').length + 1))}
                placeholder={'flowchart LR\n  A --> B'}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onKeyDown}
                onSelect={(e) => trackCaret(e.currentTarget)}
                onFocus={(e) => trackCaret(e.currentTarget)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error && <pre className="b-mermaid-error">{error.split('\n').slice(0, 4).join('\n')}</pre>}
        {svg ? (
          <div className={`b-mermaid-stage${linking ? ' is-linking' : ''}`}>
            <div ref={canvasRef} className="b-mermaid-canvas" onClick={onCanvasClick} dangerouslySetInnerHTML={{ __html: svg }} />
            {labelEdit && (
              <input
                className="b-mermaid-label-input"
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                value={labelEdit.value}
                style={{ left: labelEdit.left, top: labelEdit.top, width: labelEdit.width }}
                onChange={(e) => setLabelEdit({ ...labelEdit, value: e.target.value })}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabel();
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setLabelEdit(null);
                  }
                }}
              />
            )}
          </div>
        ) : (
          !error && <p className="b-empty">{code.trim() ? 'Wird gezeichnet …' : 'Noch leer – über „Code“ ein Diagramm beschreiben.'}</p>
        )}
      </div>
    </NodeViewWrapper>
  );
}
