import { useEffect, useId, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';

type MermaidApi = typeof import('mermaid').default;

// Mermaid ist groß – erst laden, wenn wirklich ein Mermaid-Block angezeigt wird.
let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

let renderCount = 0;

function isDark() {
  return getComputedStyle(document.documentElement).colorScheme.includes('dark');
}

/** Rendert Mermaid-Code zu SVG; Fehler werden als Meldung statt als Absturz zurückgegeben. */
export async function renderMermaid(code: string, dark: boolean): Promise<{ svg: string } | { error: string }> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
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

/** Beobachtet Hell/Dunkel (System oder data-theme), damit das Diagramm mitwechselt. */
function useDarkMode() {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, []);
  return dark;
}

export function MermaidView({ node, editor, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const code = node.attrs.code as string;
  const [editing, setEditing] = useState(() => !code.trim());
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const dark = useDarkMode();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      updateAttributes({ code: code.slice(0, s) + '  ' + code.slice(end) });
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <NodeViewWrapper className="b-block b-mermaid" data-interactive="">
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="mermaid" /> Mermaid
          </span>
          {editable && (
            <button type="button" className={`b-chip-btn${editing ? ' active' : ''}`} onClick={() => setEditing((v) => !v)}>
              <Icon name={editing ? 'check' : 'pencil'} /> {editing ? 'Fertig' : 'Code'}
            </button>
          )}
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
                value={code}
                spellCheck={false}
                rows={Math.min(16, Math.max(4, code.split('\n').length + 1))}
                placeholder={'flowchart LR\n  A --> B'}
                onChange={(e) => updateAttributes({ code: e.target.value })}
                onKeyDown={onKeyDown}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error && <pre className="b-mermaid-error">{error.split('\n').slice(0, 4).join('\n')}</pre>}
        {svg ? (
          <div className="b-mermaid-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          !error && <p className="b-empty">{code.trim() ? 'Wird gezeichnet …' : 'Noch leer – über „Code“ ein Diagramm beschreiben.'}</p>
        )}
      </div>
    </NodeViewWrapper>
  );
}
