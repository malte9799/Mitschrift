import { Extension } from '@tiptap/core';
import { DOMSerializer, type Node as ProseNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { marked } from 'marked';
import { blockHtml } from '@/export/html';
import { blocksToMarkdown } from '@/export/text';
import type { PMNode } from '@/export/model';

/** Zeilen, die fast nur in Markdown vorkommen (Überschrift, Liste, Zitat, Code-Zaun, Tabelle, Toggle …). */
const MD_LINE = /^(<details>|#{1,6}\s|\s*[-*+]\s+\[[ xX]\]\s|\s*[-*+]\s|\s*\d+[.)]\s|>\s?|```|~~~|\|.*\|\s*$|(-{3,}|\*{3,}|_{3,})\s*$|\[\^[^\]]+\]:)/m;
/** Inline-Markdown: **fett**, `code`, [Link](url), ![Bild](url), $Formel$, [^Fußnote]. */
const MD_INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|!?\[[^\]\n]*\]\([^)\s]+\)|\$[^\s$](?:[^$\n]*?[^\s$\\])?\$|\[\^[^\]\n]+\])/;

function looksLikeMarkdown(text: string) {
  return MD_LINE.test(text) || MD_INLINE.test(text);
}

/** Echte Rich-Text-Quellen (Webseite, Word, andere Notiz-Apps) bringen Struktur-Tags mit – dann deren HTML nehmen. */
function htmlHasStructure(html: string) {
  return /<(h[1-6]|ul|ol|li|table|pre|blockquote|strong|b|em|i|a|img)[\s>]/i.test(html);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Formeln (`$…$`, `$$…$$`) und Fußnoten (`[^1]` … `[^1]: …`) kennt `marked` nicht – vor dem eigentlichen
 * Markdown-Parsen durch eigene Platzhalter-Tags ersetzen, die die Knoten beim Einlesen wiedererkennen
 * (siehe `parseHTML` in `MathNodes.ts`/`Footnote.ts`). Codezäune bleiben unangetastet.
 */
function extractMathAndFootnotes(md: string): string {
  const lines = md.split('\n');
  const footnotes = new Map<string, string>();
  const kept: string[] = [];
  let inFence = false;

  // 1. Durchlauf: Fußnoten-Definitionen sammeln und aus dem Text entfernen (mit hängenden Folgezeilen).
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence) {
      const def = /^\[\^([^\]]+)\]:\s?(.*)$/.exec(line);
      if (def) {
        const body = [def[2]];
        while (i + 1 < lines.length && /^(\s{2,}|\t)\S/.test(lines[i + 1])) body.push(lines[++i].trim());
        footnotes.set(def[1], body.join(' ').trim());
        continue;
      }
    }
    kept.push(line);
  }

  // 2. Durchlauf: `$$ … $$`-Blöcke (eigene Zeilen, ggf. mehrzeilig) zu Formel-Blöcken zusammenfassen.
  inFence = false;
  const merged: string[] = [];
  for (let i = 0; i < kept.length; i++) {
    const line = kept[i];
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      merged.push(line);
      continue;
    }
    if (!inFence && /^\$\$\s*$/.test(line.trim())) {
      const body: string[] = [];
      let j = i + 1;
      while (j < kept.length && !/^\$\$\s*$/.test(kept[j].trim())) body.push(kept[j++]);
      if (j < kept.length) {
        merged.push(`<div data-math-block data-latex="${esc(body.join('\n').trim())}"></div>`);
        i = j;
        continue;
      }
    }
    merged.push(line);
  }

  // 3. Durchlauf: `$$…$$` auf einer Zeile sowie inline `$…$` und Fußnoten-Verweise umwandeln.
  inFence = false;
  const out = merged.map((line) => {
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    const block = /^\$\$(.+)\$\$$/.exec(line.trim());
    if (block) return `<div data-math-block data-latex="${esc(block[1].trim())}"></div>`;
    return line
      .replace(/(?<![$\\\w])\$([^\s$](?:[^$\n]*?[^\s$\\])?)\$(?!\$)/g, (_m, latex: string) => `<span data-math-inline data-latex="${esc(latex)}"></span>`)
      .replace(/\[\^([^\]\n]+)\]/g, (m, id: string) => (footnotes.has(id) ? `<sup data-footnote data-footnote="${esc(footnotes.get(id)!)}"></sup>` : m));
  });
  return out.join('\n');
}

/** Markdown → HTML, das die eigenen Knoten (Checklisten, Hinweise, Mermaid, Formeln, Fußnoten) beim Einlesen wiedererkennen. */
export function markdownToHtml(md: string) {
  const doc = new DOMParser().parseFromString(marked.parse(extractMathAndFootnotes(md), { async: false, gfm: true }), 'text/html');

  // Checklisten: <li><input type=checkbox> … → Tiptap-TaskList.
  doc.querySelectorAll('li > input[type="checkbox"]:first-child').forEach((box) => {
    const li = box.parentElement!;
    const checked = (box as HTMLInputElement).hasAttribute('checked');
    box.remove();
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', String(checked));
    li.parentElement?.setAttribute('data-type', 'taskList');
    if (li.firstChild?.nodeType === Node.TEXT_NODE) li.firstChild.textContent = li.firstChild.textContent!.replace(/^\s+/, '');
  });

  // ```mermaid → Mermaid-Block.
  doc.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
    const div = doc.createElement('div');
    div.setAttribute('data-mermaid', '');
    div.setAttribute('data-code', code.textContent?.replace(/\n$/, '') ?? '');
    code.parentElement!.replaceWith(div);
  });

  // marked hängt an Codeblöcke einen Zeilenumbruch an.
  doc.querySelectorAll('pre > code').forEach((code) => {
    code.textContent = code.textContent?.replace(/\n$/, '') ?? '';
  });

  // <details><summary> (so exportieren wir Toggles) → Toggle-Block.
  doc.querySelectorAll('details:not([data-toggle])').forEach((details) => {
    details.setAttribute('data-toggle', '');
    const body = doc.createElement('div');
    body.append(...[...details.childNodes].filter((c) => !(c instanceof HTMLElement && c.tagName === 'SUMMARY')));
    if (!body.textContent?.trim()) body.innerHTML = '<p></p>';
    details.append(body);
  });

  // GitHub-Hinweise: > [!NOTE] … → Hinweis-Kasten.
  doc.querySelectorAll('blockquote').forEach((quote) => {
    const first = quote.querySelector(':scope > p');
    const m = first?.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br>)?\s*/i);
    if (!first || !m) return;
    first.innerHTML = first.innerHTML.slice(m[0].length);
    if (!first.textContent?.trim()) first.remove();
    const div = doc.createElement('div');
    div.dataset.callout = m[1].toLowerCase();
    div.append(...quote.childNodes);
    quote.replaceWith(div);
  });

  return doc.body.innerHTML;
}

/** Blöcke, die ihre Daten nur in Attributen tragen – ihr HTML wäre in anderen Apps leer. */
const DATA_BLOCKS = ['mermaid', 'whiteboard', 'svg', 'quiz', 'flashcards', 'collection', 'diagram', 'plot', 'timeline'];

/**
 * Wie der normale Serializer, legt aber in Daten-Blöcke lesbares HTML (Code, Tabellen, Fragen).
 * Beim Einfügen in Mitschrift zählen weiter nur die data-Attribute – die Blöcke sind Atome, der Inhalt wird ignoriert.
 */
function readableSerializer(base: DOMSerializer) {
  const nodes = { ...base.nodes };
  for (const name of DATA_BLOCKS) {
    const render = nodes[name];
    if (!render) continue;
    nodes[name] = (node: ProseNode) => {
      const spec = render(node);
      const dom = DOMSerializer.renderSpec(document, spec).dom as HTMLElement;
      dom.innerHTML = blockHtml(node.toJSON() as PMNode);
      return dom;
    };
  }
  return new DOMSerializer(nodes, base.marks);
}

/**
 * Zwischenablage als Markdown: Eingefügtes Markdown (reiner Text aus Editoren, Chats, .md-Dateien) wird zu Blöcken,
 * kopierte Blöcke landen als Markdown im Text-Teil der Zwischenablage (HTML bleibt für Rich-Text-Ziele).
 */
export const MarkdownClipboard = Extension.create({
  name: 'markdownClipboard',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownClipboard'),
        props: {
          clipboardSerializer: readableSerializer(DOMSerializer.fromSchema(this.editor.schema)),
          clipboardTextSerializer(slice) {
            const { content } = slice;
            // Nur ein Stück Text innerhalb eines Absatzes: schlicht als Text, ohne Markdown-Zeichen.
            if (slice.openStart > 0 && content.childCount === 1 && content.firstChild!.isTextblock) {
              return content.textBetween(0, content.size, '\n');
            }
            return blocksToMarkdown(content.toJSON() as PMNode[]);
          },
          handlePaste(view, event) {
            const data = event.clipboardData;
            const text = data?.getData('text/plain');
            if (!text || !looksLikeMarkdown(text)) return false;
            // Im Codeblock bleibt Text Text.
            if (view.state.selection.$from.parent.type.spec.code) return false;
            const html = data?.getData('text/html');
            if (html && htmlHasStructure(html)) return false;
            // Ohne das Original-Event, sonst landet der Paste wieder hier.
            return view.pasteHTML(markdownToHtml(text));
          },
        },
      }),
    ];
  },
});
