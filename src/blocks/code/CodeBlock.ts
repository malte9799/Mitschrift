import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { common, createLowlight } from 'lowlight';
import { CodeBlockView } from './CodeBlockView';

/** Gemeinsame Lowlight-Instanz mit den ~35 gängigsten Sprachen (highlight.js „common“). */
export const lowlight = createLowlight(common);

/** Auswahl im Sprachmenü – Anzeigename je highlight.js-Sprache. */
export const codeLanguages: { value: string; label: string }[] = [
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'Diff' },
  { value: 'go', label: 'Go' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'ini', label: 'INI / TOML' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'less', label: 'Less' },
  { value: 'lua', label: 'Lua' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'objectivec', label: 'Objective-C' },
  { value: 'perl', label: 'Perl' },
  { value: 'php', label: 'PHP' },
  { value: 'plaintext', label: 'Nur Text' },
  { value: 'python', label: 'Python' },
  { value: 'r', label: 'R' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'scss', label: 'SCSS' },
  { value: 'shell', label: 'Shell-Sitzung' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'vbnet', label: 'VB.NET' },
  { value: 'yaml', label: 'YAML' },
];

/**
 * Codeblock mit Syntax-Highlighting: Sprache wählbar oder automatisch erkannt,
 * Zeilennummern und Kopier-Knopf. Ersetzt den einfachen Codeblock des StarterKits
 * (gleicher Knotenname `codeBlock`, bestehende Notizen bleiben kompatibel).
 */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: null,
  enableTabIndentation: true,
  tabSize: 2,
});
