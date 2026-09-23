import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { marked } from 'marked';
import { blocksToMarkdown } from '@/export/text';
import type { PMNode } from '@/export/model';

/** Zeilen, die fast nur in Markdown vorkommen (Überschrift, Liste, Zitat, Code-Zaun, Tabelle, Toggle …). */
const MD_LINE = /^(<details>|#{1,6}\s|\s*[-*+]\s+\[[ xX]\]\s|\s*[-*+]\s|\s*\d+[.)]\s|>\s?|```|~~~|\|.*\|\s*$|(-{3,}|\*{3,}|_{3,})\s*$)/m;
/** Inline-Markdown: **fett**, `code`, [Link](url), ![Bild](url). */
const MD_INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|!?\[[^\]\n]*\]\([^)\s]+\))/;

function looksLikeMarkdown(text: string) {
  return MD_LINE.test(text) || MD_INLINE.test(text);
}

/** Echte Rich-Text-Quellen (Webseite, Word, andere Notiz-Apps) bringen Struktur-Tags mit – dann deren HTML nehmen. */
function htmlHasStructure(html: string) {
  return /<(h[1-6]|ul|ol|li|table|pre|blockquote|strong|b|em|i|a|img)[\s>]/i.test(html);
}


/** Markdown → HTML, das die eigenen Knoten (Checklisten, Hinweise, Mermaid) beim Einlesen wiedererkennen. */
export function markdownToHtml(md: string) {
  const doc = new DOMParser().parseFromString(marked.parse(md, { async: false, gfm: true }), 'text/html');

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
