import { lowlight } from '@/blocks/code/CodeBlock';
import { kindLabels, type DiagramItem, type DiagramKind } from '@/blocks/diagram/DiagramNode';
import type { Flashcard } from '@/blocks/flashcard/FlashcardsNode';
import type { QuizQuestion } from '@/blocks/quiz/QuizNode';
import { calloutVariant } from '@/editor/CalloutNode';
import { calloutLabels, collectionTables, tableRows, untitled, type Assets, type ExportDoc, type PMMark, type PMNode } from './model';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Nur einfache Farbwerte durchlassen – kein CSS aus der Notiz ins Dokument schmuggeln. */
const safeColor = (c: unknown) => (typeof c === 'string' && /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|var\(--[\w-]+\))$/i.test(c) ? c : null);
const safeHref = (h: unknown) => (typeof h === 'string' && !/^\s*javascript:/i.test(h) ? h : '#');

function wrapMark(m: PMMark, inner: string): string {
  switch (m.type) {
    case 'bold':
      return `<strong>${inner}</strong>`;
    case 'italic':
      return `<em>${inner}</em>`;
    case 'strike':
      return `<s>${inner}</s>`;
    case 'underline':
      return `<u>${inner}</u>`;
    case 'code':
      return `<code>${inner}</code>`;
    case 'cloze':
      return `<mark class="cloze">${inner}</mark>`;
    case 'link':
      return `<a href="${esc(safeHref(m.attrs?.href))}">${inner}</a>`;
    case 'textStyle': {
      const color = safeColor(m.attrs?.color);
      return color ? `<span style="color:${esc(color)}">${inner}</span>` : inner;
    }
    default:
      return inner;
  }
}

function inline(nodes: PMNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '<br>';
      if (n.type !== 'text') return inline(n.content);
      // Links außen, damit verschachtelte Formatierung im Link bleibt.
      const marks = [...(n.marks ?? [])].sort((a, b) => (a.type === 'link' ? 1 : 0) - (b.type === 'link' ? 1 : 0));
      return marks.reduce((out, m) => wrapMark(m, out), esc(n.text ?? ''));
    })
    .join('');
}

interface HastNode {
  type: string;
  value?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

function hastToHtml(n: HastNode): string {
  if (n.type === 'text') return esc(n.value ?? '');
  const inner = (n.children ?? []).map(hastToHtml).join('');
  if (n.type === 'element') return `<span class="${esc((n.properties?.className ?? []).join(' '))}">${inner}</span>`;
  return inner;
}

function highlight(code: string, language: string | null): string {
  try {
    const tree = language && lowlight.registered(language) ? lowlight.highlight(language, code) : lowlight.highlightAuto(code);
    return hastToHtml(tree as HastNode);
  } catch {
    return esc(code);
  }
}

function table(rows: string[][], header: boolean): string {
  return `<table>${rows
    .map((r, i) => {
      const tag = header && i === 0 ? 'th' : 'td';
      return `<tr>${r.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    })
    .join('')}</table>`;
}

function diagram(n: PMNode): string {
  const kind = (n.attrs?.kind ?? 'steps') as DiagramKind;
  const items = (n.attrs?.items ?? []) as DiagramItem[];
  const title = n.attrs?.title ? `<figcaption>${esc(n.attrs.title)}</figcaption>` : `<figcaption>${kindLabels[kind]}</figcaption>`;
  let body: string;
  if (kind === 'bars') {
    const max = Math.max(...items.map((i) => i.value ?? 0), 0) || 1;
    body = `<div class="bars">${items
      .map(
        (i) =>
          `<div class="bar"><span class="bar-label">${esc(i.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(0, ((i.value ?? 0) / max) * 100).toFixed(1)}%"></span></span><span class="bar-value">${esc(i.text || String(i.value ?? ''))}</span></div>`,
      )
      .join('')}</div>`;
  } else if (kind === 'timeline') {
    body = `<dl class="timeline">${items.map((i) => `<div><dt>${esc(i.label)}</dt><dd>${esc(i.text)}</dd></div>`).join('')}</dl>`;
  } else {
    body = `<ol class="steps${kind === 'cycle' ? ' cycle' : ''}">${items.map((i) => `<li><strong>${esc(i.label)}</strong>${i.text ? `<span>${esc(i.text)}</span>` : ''}</li>`).join('')}</ol>`;
  }
  return `<figure class="diagram diagram-${kind}">${title}${body}</figure>`;
}

function blocks(nodes: PMNode[] | undefined, assets: Assets): string {
  return (nodes ?? []).map((n) => block(n, assets)).filter(Boolean).join('\n');
}

function block(n: PMNode, assets: Assets): string {
  const a = n.attrs ?? {};
  const align = a.textAlign && a.textAlign !== 'left' ? ` style="text-align:${esc(a.textAlign)}"` : '';
  switch (n.type) {
    case 'paragraph': {
      const content = inline(n.content);
      if (!content) return '';
      return `<p${a.variant ? ` class="${esc(a.variant)}"` : ''}${align}>${content}</p>`;
    }
    case 'heading': {
      // Notiz-Überschriften eine Ebene tiefer: h1 ist der Notiztitel.
      const level = Math.min(6, (a.level ?? 1) + 1);
      return `<h${level}${align}>${inline(n.content)}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${blocks(n.content, assets)}</ul>`;
    case 'orderedList':
      return `<ol${a.start && a.start !== 1 ? ` start="${Number(a.start)}"` : ''}>${blocks(n.content, assets)}</ol>`;
    case 'listItem':
      return `<li>${blocks(n.content, assets)}</li>`;
    case 'taskList':
      return `<ul class="tasks">${blocks(n.content, assets)}</ul>`;
    case 'taskItem':
      return `<li class="task${a.checked ? ' done' : ''}"><input type="checkbox" disabled${a.checked ? ' checked' : ''}><div>${blocks(n.content, assets)}</div></li>`;
    case 'blockquote':
      return `<blockquote>${blocks(n.content, assets)}</blockquote>`;
    case 'horizontalRule':
      return '<hr>';
    case 'codeBlock': {
      const code = (n.content ?? []).map((c) => c.text ?? '').join('');
      const lang = (a.language as string | null) || null;
      return `<pre class="code"><code${lang ? ` class="language-${esc(lang)}"` : ''}>${highlight(code, lang)}</code></pre>`;
    }
    case 'image': {
      const img = assets.images.get(a.src);
      if (!img) return '';
      return `<figure class="image"><img src="${esc(img.url)}"${a.alt ? ` alt="${esc(a.alt)}"` : ''}>${a.title ? `<figcaption>${esc(a.title)}</figcaption>` : ''}</figure>`;
    }
    case 'callout': {
      const variant = calloutVariant(a.variant);
      return `<aside class="callout callout-${variant}"><p class="callout-label">${calloutLabels[variant]}</p>${blocks(n.content, assets)}</aside>`;
    }
    case 'toggleBlock':
      return `<details open><summary>${esc(a.summary || 'Aufklappen')}</summary>${blocks(n.content, assets)}</details>`;
    case 'flashcards': {
      const cards = (a.cards ?? []) as Flashcard[];
      return `<section class="flashcards"><h4>${esc(a.title || 'Karteikarten')}</h4>${table(
        [['Vorderseite', 'Rückseite'], ...cards.map((c) => [esc(c.front), esc(c.back)])],
        true,
      )}</section>`;
    }
    case 'quiz': {
      const qs = (a.questions ?? []) as QuizQuestion[];
      return `<section class="quiz"><h4>Quiz</h4><ol>${qs
        .map(
          (q) =>
            `<li><p class="question">${esc(q.question)}</p><ul class="options">${q.options
              .map((o, i) => `<li${i === q.correct ? ' class="correct"' : ''}>${esc(o)}</li>`)
              .join('')}</ul>${q.why ? `<p class="why"><strong>Erklärung:</strong> ${esc(q.why)}</p>` : ''}</li>`,
        )
        .join('')}</ol></section>`;
    }
    case 'diagram':
      return diagram(n);
    case 'mermaid': {
      const svg = assets.mermaid.get(a.code);
      return svg ? `<figure class="mermaid">${svg}</figure>` : `<pre class="code"><code>${esc(a.code ?? '')}</code></pre>`;
    }
    case 'table': {
      const rows = tableRows(n);
      return `<table>${rows
        .map(
          (r) =>
            `<tr>${r
              .map((c) => {
                const tag = c.type === 'tableHeader' ? 'th' : 'td';
                const { colspan = 1, rowspan = 1 } = c.attrs ?? {};
                const span = `${colspan > 1 ? ` colspan="${Number(colspan)}"` : ''}${rowspan > 1 ? ` rowspan="${Number(rowspan)}"` : ''}`;
                return `<${tag}${span}>${blocks(c.content, assets)}</${tag}>`;
              })
              .join('')}</tr>`,
        )
        .join('')}</table>`;
    }
    case 'collection':
      return collectionTables(a.data)
        .map((t) => `<section class="collection"><h4>${esc(t.name)}</h4>${table(t.rows.map((r) => r.map(esc)), true)}</section>`)
        .join('\n');
    default:
      return n.content ? blocks(n.content, assets) : '';
  }
}

const css = `
:root{--ink:#1C1C1E;--soft:#6E6E73;--faint:#A1A1A6;--line:#E7E7E4;--paper:#FFFFFF;--paper-2:#F5F5F3;--accent:#5B5BD6;--accent-bg:#EEEEFC;
--green:#1F8A4C;--green-bg:#E8F6EE;--amber:#B8650A;--amber-bg:#FFF6E6;--red:#D93A2B;--red-bg:#FDEEEC;--blue:#1F6FD1;--blue-bg:#EAF3FE;--purple:#8250DF}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 "Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:720px;margin:0 auto;padding:56px 24px 80px}
h1{font-size:40px;line-height:1.15;letter-spacing:-.025em;margin:0 0 12px}
h2{font-size:28px;letter-spacing:-.02em;line-height:1.25;margin:32px 0 10px}
h3{font-size:22px;letter-spacing:-.015em;line-height:1.3;margin:26px 0 8px}
h4{font-size:17px;margin:22px 0 8px}
p{margin:0 0 12px}
p.strong{font-weight:600}
p.caption{font-size:14px;color:var(--soft)}
a{color:var(--accent)}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 28px;padding:0;list-style:none}
.tags li{font-size:13px;font-weight:550;padding:2px 10px;border-radius:999px;background:var(--accent-bg);color:var(--accent)}
ul,ol{margin:0 0 12px;padding-left:1.5em}
li>p{margin:0 0 4px}
ul.tasks{list-style:none;padding-left:0}
li.task{display:flex;gap:8px;align-items:flex-start}
li.task input{margin-top:.4em}
li.task.done>div{color:var(--faint);text-decoration:line-through}
blockquote{margin:0 0 14px;padding:2px 0 2px 16px;border-left:3px solid var(--line);color:var(--soft)}
hr{border:0;border-top:1px solid var(--line);margin:28px 0}
code{font:0.88em "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;background:var(--paper-2);padding:.1em .35em;border-radius:5px}
pre.code{background:#F6F6F4;color:#1F2328;border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow:auto;margin:0 0 16px;font-size:13.5px;line-height:1.55}
pre.code code{background:none;padding:0;font-size:inherit;white-space:pre}
mark.cloze{background:var(--accent-bg);color:var(--accent);border-radius:4px;padding:0 3px;font-weight:550}
figure{margin:0 0 18px}
figure.image img{display:block;max-width:100%;height:auto;border-radius:10px}
figcaption{font-size:13px;font-weight:600;color:var(--soft);margin-bottom:8px}
figure.image figcaption{margin:6px 0 0}
figure.mermaid svg{max-width:100%;height:auto}
.callout{--tone:var(--blue);margin:0 0 16px;padding:2px 0 2px 16px;border-left:4px solid var(--tone)}
.callout>:last-child{margin-bottom:0}
.callout-label{color:var(--tone);font-weight:600;margin-bottom:6px}
.callout-tip{--tone:var(--green)}.callout-important{--tone:var(--purple)}.callout-warning{--tone:var(--amber)}.callout-caution{--tone:var(--red)}
details{margin:0 0 14px;padding:10px 14px;border:1px solid var(--line);border-radius:12px}
summary{font-weight:600;cursor:pointer;margin-bottom:6px}
details>:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px}
th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}
th{background:var(--paper-2);font-weight:600}
td>p:last-child,th>p:last-child{margin:0}
.flashcards h4,.quiz h4,.collection h4{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--soft)}
.quiz>ol{padding-left:1.4em}
.quiz .question{font-weight:600;margin:0 0 6px}
.quiz .options{list-style:none;padding:0;margin:0 0 8px}
.quiz .options li{padding:4px 10px;margin-bottom:4px;border:1px solid var(--line);border-radius:8px}
.quiz .options li.correct{border-color:var(--green);background:var(--green-bg);color:var(--green);font-weight:550}
.quiz .options li.correct::after{content:"  ✓"}
.quiz .why{font-size:14px;color:var(--soft)}
.diagram ol.steps{list-style:none;padding:0;counter-reset:s;display:grid;gap:8px}
.diagram ol.steps li{counter-increment:s;display:grid;grid-template-columns:28px 1fr;column-gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px}
.diagram ol.steps li::before{content:counter(s);grid-row:span 2;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--accent-bg);color:var(--accent);font-weight:700;font-size:13px}
.diagram ol.steps li span{color:var(--soft);font-size:14px}
.diagram ol.cycle li:last-child::after{content:"↻ zurück zu 1";grid-column:2;font-size:12px;color:var(--faint)}
.timeline{margin:0;border-left:2px solid var(--accent-bg);padding-left:16px}
.timeline>div{margin-bottom:10px}
.timeline dt{font-weight:700;color:var(--accent)}
.timeline dd{margin:0;color:var(--soft)}
.bars{display:grid;gap:8px}
.bar{display:grid;grid-template-columns:minmax(80px,25%) 1fr auto;gap:10px;align-items:center;font-size:14px}
.bar-track{height:12px;border-radius:6px;background:var(--paper-2);overflow:hidden}
.bar-fill{display:block;height:100%;background:var(--accent);border-radius:6px}
.bar-value{color:var(--soft);font-variant-numeric:tabular-nums}
.hljs-comment,.hljs-quote{color:#6E7781;font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-doctag{color:#CF222E}
.hljs-string,.hljs-regexp,.hljs-addition{color:#0A3069}
.hljs-number,.hljs-symbol,.hljs-bullet,.hljs-attr,.hljs-attribute,.hljs-property,.hljs-selector-class,.hljs-selector-id{color:#0550AE}
.hljs-title,.hljs-section{color:#8250DF}
.hljs-type,.hljs-built_in{color:#953800}
.hljs-tag,.hljs-name{color:#116329}
.hljs-meta{color:#57606A}.hljs-deletion{color:#82071E;background:#FFEBE9}.hljs-addition{background:#DAFBE1}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}
@media print{
  @page{margin:18mm 16mm}
  body{font-size:11.5pt}
  main{max-width:none;padding:0}
  h2,h3,h4{break-after:avoid}
  pre,figure,table,.callout,details,.quiz>ol>li,.diagram li{break-inside:avoid}
  a{color:inherit}
}
`;

/** Vollständiges, eigenständiges HTML-Dokument der Notiz (auch Grundlage für den PDF-Export). */
export function toHtml({ title, tags, doc, assets }: ExportDoc): string {
  const name = untitled(title);
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Mitschrift">
<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<main>
<h1>${esc(name)}</h1>
${tags.length ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
${blocks(doc.content, assets)}
</main>
</body>
</html>
`;
}
