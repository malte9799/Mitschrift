import { useEffect, useMemo, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { codeLanguages, lowlight } from './CodeBlock';

const labelOf = (lang: string | null | undefined) => codeLanguages.find((l) => l.value === lang)?.label ?? lang ?? '';

export function CodeBlockView({ node, editor, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const language = (node.attrs.language as string | null) || null;
  const text = node.textContent;
  const [copied, setCopied] = useState(false);

  // Automatisch erkannte Sprache – nur zur Anzeige, das Highlighting macht Lowlight selbst.
  const detected = useMemo(() => {
    if (language || !text.trim()) return null;
    return (lowlight.highlightAuto(text).data?.language as string | undefined) ?? null;
  }, [language, text]);

  const lineCount = Math.max(1, text.split('\n').length);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* Zwischenablage nicht verfügbar – nichts tun */
    }
  }

  const shownLanguage = language ? labelOf(language) : detected ? labelOf(detected) : 'Automatisch';

  return (
    <NodeViewWrapper className="b-code" data-language={language ?? detected ?? ''}>
      <div className="b-code-head" contentEditable={false}>
        {editable ? (
          <label className="b-code-lang">
            <select value={language ?? ''} onChange={(e) => updateAttributes({ language: e.target.value || null })} aria-label="Sprache">
              <option value="">{detected ? `Automatisch · ${labelOf(detected)}` : 'Automatisch'}</option>
              {codeLanguages.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true">{shownLanguage}</span>
            <Icon name="chevron" />
          </label>
        ) : (
          <span className="b-code-lang is-static">{shownLanguage}</span>
        )}
        <button type="button" className={`b-code-copy${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Code kopieren">
          <Icon name={copied ? 'check' : 'copy'} />
          <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
        </button>
      </div>
      <div className="b-code-body">
        <div className="b-code-gutter" contentEditable={false} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre spellCheck={false}>
          <NodeViewContent<'code'> as="code" className={`hljs${language ? ` language-${language}` : ''}`} />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
