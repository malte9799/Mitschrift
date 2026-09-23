import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBlockBar } from '@/editor/BlockBar';
import { codeLanguages, lowlight } from './CodeBlock';
import { baseName, openWorkspaceAt } from './files';

const labelOf = (lang: string | null | undefined) => codeLanguages.find((l) => l.value === lang)?.label ?? lang ?? '';

export function CodeBlockView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
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

  const filename = (node.attrs.filename as string | null) || null;

  function openFullscreen() {
    const pos = getPos();
    if (typeof pos === 'number') openWorkspaceAt(editor, pos);
  }

  const shownLanguage = language ? labelOf(language) : detected ? labelOf(detected) : 'Automatisch';

  return (
    <NodeViewWrapper
      className="b-code"
      data-language={language ?? detected ?? ''}
      onDoubleClick={(e: MouseEvent) => {
        e.preventDefault();
        openFullscreen();
      }}
    >
      {bar.render(
        <>
          <label className="c-bar-select" title="Sprache">
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
          <BarSep />
          <BarButton icon="expand" label="Im Vollbild-Editor öffnen (Doppelklick)" text="Vollbild" onClick={openFullscreen} />
          <BarButton icon={copied ? 'check' : 'copy'} label="Code kopieren" text={copied ? 'Kopiert' : 'Kopieren'} active={copied} onClick={copy} />
        </>,
      )}
      <div className="b-code-head" contentEditable={false}>
        {filename && (
          <span className="b-code-file" title={filename}>
            <Icon name="file" />
            {baseName(filename)}
          </span>
        )}
        <span className="b-code-lang is-static">{shownLanguage}</span>
        <span className="b-code-spacer" />
        {!editable && (
          <>
            <button type="button" className="b-code-copy" onClick={openFullscreen} aria-label="Im Vollbild-Editor öffnen" title="Vollbild-Editor (Doppelklick)">
              <Icon name="expand" />
            </button>
            <button type="button" className={`b-code-copy${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Code kopieren">
              <Icon name={copied ? 'check' : 'copy'} />
              <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
            </button>
          </>
        )}
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
