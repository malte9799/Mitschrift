import { lowlight } from '@/blocks/code/CodeBlock';
import { kindLabels, type DiagramItem, type DiagramKind } from '@/blocks/diagram/DiagramNode';
import type { Flashcard } from '@/blocks/flashcard/FlashcardsNode';
import type { QuizQuestion } from '@/blocks/quiz/QuizNode';
import { resolveCallout, type CalloutColor } from '@/editor/CalloutNode';
import { applyStyle, contentStyleOf, svgDataUrl } from '@/blocks/svg/model';
import { glossaryRows, plotSummary, plotSvg, timelineRows } from './extraBlocks';
import { collectCollections, collectionTables, imageAsset, noteBlockAsParagraph, smartLinkAsParagraph, tableRows, untitled, type Assets, type ExportDoc, type PMMark, type PMNode } from './model';
import type { CollectionData } from '@/blocks/collection/model';

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
    case 'kbd':
      return `<kbd>${inner}</kbd>`;
    case 'subscript':
      return `<sub>${inner}</sub>`;
    case 'superscript':
      return `<sup>${inner}</sup>`;
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

/** Fußnoten in Dokument-Reihenfolge, gesammelt während `inline()`/`block()` – ihr Index (+1) ist ihre Nummer. */
let footnotes: string[] = [];

/** Alle Sammlungen der Notiz – für Verknüpfungsfelder, deren Zielblatt in einer anderen Sammlung liegt. */
let allCollections: CollectionData[] = [];

function inline(nodes: PMNode[] = [], assets?: Assets): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '<br>';
      if (n.type === 'mathInline') {
        const mathml = assets?.math.get(`false:${n.attrs?.latex}`);
        return mathml ?? `<code class="math-src">${esc(String(n.attrs?.latex ?? ''))}</code>`;
      }
      if (n.type === 'footnote') {
        const num = footnotes.push(String(n.attrs?.text ?? ''));
        return `<sup class="fn-ref" id="fnref-${num}"><a href="#fn-${num}">${num}</a></sup>`;
      }
      if (n.type !== 'text') return inline(n.content, assets);
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
      const content = inline(n.content, assets);
      if (!content) return '';
      return `<p${a.variant ? ` class="${esc(a.variant)}"` : ''}${align}>${content}</p>`;
    }
    case 'heading': {
      // Notiz-Überschriften eine Ebene tiefer: h1 ist der Notiztitel.
      const level = Math.min(6, (a.level ?? 1) + 1);
      return `<h${level}${align}>${inline(n.content, assets)}</h${level}>`;
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
    case 'noteBlock':
      return block(noteBlockAsParagraph(n), assets);
    case 'smartLink':
      return block(smartLinkAsParagraph(n), assets);
    case 'mathBlock': {
      const mathml = assets.math.get(`true:${a.latex}`);
      return mathml ? `<div class="math-block">${mathml}</div>` : `<pre class="code"><code>${esc(String(a.latex ?? ''))}</code></pre>`;
    }
    case 'horizontalRule':
      return a.variant && a.variant !== 'regular' ? `<hr data-variant="${esc(String(a.variant))}">` : '<hr>';
    case 'codeBlock': {
      const code = (n.content ?? []).map((c) => c.text ?? '').join('');
      const lang = (a.language as string | null) || null;
      return `<pre class="code"><code${lang ? ` class="language-${esc(lang)}"` : ''}>${highlight(code, lang)}</code></pre>`;
    }
    case 'image': {
      const img = a.src ? imageAsset(assets, a.src, a.edit) : undefined;
      if (!img) return '';
      // Umfließen bleibt erhalten; frei platzierte Bilder stehen im Export als normaler Block.
      const layout = a.layout === 'left' || a.layout === 'right' ? a.layout : 'inline';
      const width = Number(a.width) > 0 ? Math.min(100, Number(a.width)) : layout === 'inline' ? 0 : 40;
      const attrs = [`data-layout="${layout}"`, layout === 'inline' && a.align && a.align !== 'left' ? `data-align="${esc(String(a.align))}"` : '', a.frame && a.frame !== 'soft' ? `data-frame="${esc(String(a.frame))}"` : '']
        .filter(Boolean)
        .join(' ');
      return `<figure class="image" ${attrs}${width ? ` style="width:${width}%"` : ''}><img src="${esc(img.url)}"${a.alt ? ` alt="${esc(a.alt)}"` : ''}>${a.title ? `<figcaption>${esc(a.title)}</figcaption>` : ''}</figure>`;
    }
    case 'gallery': {
      const items = ((a.items ?? []) as { src: string; caption?: string; alt?: string; edit?: Parameters<typeof imageAsset>[2] }[])
        .map((it) => ({ it, img: it.src ? imageAsset(assets, it.src, it.edit) : undefined }))
        .filter((x) => x.img);
      if (!items.length) return '';
      const cols = Math.min(4, Math.max(1, Number(a.columns) || 3));
      return `<figure class="gallery">${a.title ? `<figcaption>${esc(a.title)}</figcaption>` : ''}<div class="gallery-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${items
        .map(({ it, img }) => `<figure><img src="${esc(img!.url)}" alt="${esc(it.alt || it.caption || '')}">${a.captions !== false && it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''}</figure>`)
        .join('')}</div></figure>`;
    }
    case 'callout': {
      const c = resolveCallout(a);
      return `<aside class="callout callout-${c.variant} callout-style-${c.style}" style="--tone:${calloutHex[c.color]}"><p class="callout-label">${esc(c.title)}</p>${blocks(n.content, assets)}</aside>`;
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
      return svg ? `<figure class="mermaid">${svg}</figure>` : `<pre class="code"><code class="language-mermaid">${esc(a.code ?? '')}</code></pre>`;
    }
    case 'whiteboard':
      // Als <img>: Das SVG stammt aus dem Dokument und könnte beim Einfügen von außen gekommen sein.
      return a.svg ? `<figure class="whiteboard"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(a.svg)}" alt="Whiteboard"></figure>` : '';
    case 'svg': {
      if (!a.svg) return '';
      // Als <img> – wie beim Whiteboard kann das SVG von außen stammen.
      const svg = applyStyle(String(a.svg), contentStyleOf(a));
      const w = typeof a.width === 'number' ? `width:${a.width}%;` : '';
      const bg = typeof a.background === 'string' && /^#[0-9a-f]{3,8}$/i.test(a.background) ? `background:${a.background};` : a.background ? 'background:#fff;' : '';
      const pad = typeof a.padding === 'number' && a.padding ? `padding:${a.padding}px;` : '';
      const border = a.border ? 'border:1px solid var(--line);' : '';
      const opacity = typeof a.opacity === 'number' && a.opacity !== 1 ? `opacity:${a.opacity};` : '';
      const align = ['left', 'right', 'floatLeft', 'floatRight'].includes(a.align) ? ` data-align="${a.align}"` : '';
      const alt = esc(String(a.alt || a.caption || 'Grafik'));
      return `<figure class="svg"${align}><div style="${w}${bg}${pad}${border}${opacity}"><img src="${svgDataUrl(svg)}" alt="${alt}"></div>${a.caption ? `<figcaption>${esc(a.caption)}</figcaption>` : ''}</figure>`;
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
      return collectionTables(a.data, allCollections)
        .map((t) => `<section class="collection"><h4>${esc(t.name)}</h4>${table(t.rows.map((r) => r.map(esc)), true)}</section>`)
        .join('\n');
    case 'plot': {
      const p = plotSummary(n);
      const legend = p.fns.map((f) => `<li><i style="background:${f.color}"></i>${esc(f.name)} = <code>${esc(f.expr)}</code></li>`).join('');
      return `<figure class="plot">${p.title ? `<figcaption>${esc(p.title)}</figcaption>` : ''}${plotSvg(n)}<ul class="plot-legend">${legend}${p.params ? `<li class="plot-params">${esc(p.params)}</li>` : ''}</ul></figure>`;
    }
    case 'timeline': {
      const t = timelineRows(n);
      if (!t.rows.length) return '';
      return `<figure class="tl">${t.title ? `<figcaption>${esc(t.title)}</figcaption>` : ''}<ol>${t.rows
        .map((r) => `<li${r.period ? ' class="period"' : ''}><span class="tl-date">${esc(r.date)}</span><strong>${esc(r.title)}</strong>${r.text ? `<span class="tl-text">${esc(r.text)}</span>` : ''}</li>`)
        .join('')}</ol></figure>`;
    }
    case 'glossaryList': {
      const g = glossaryRows(n, assets);
      if (!g || !g.rows.length) return '';
      return `<section class="glossary"><h4>${esc(g.title)}</h4><dl>${g.rows
        .map((t) => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.expansion)}${t.definition ? `<span>${esc(t.definition)}</span>` : ''}</dd></div>`)
        .join('')}</dl></section>`;
    }
    default:
      return n.content ? blocks(n.content, assets) : '';
  }
}

/** Farben der Hervorhebungen im (hellen) Export. */
/** Lesbares HTML eines einzelnen Blocks (ohne Bilder/SVG) – z. B. für die Zwischenablage. */
export function blockHtml(n: PMNode): string {
  footnotes = [];
  allCollections = collectCollections(n);
  return block(n, { images: new Map(), mermaid: new Map(), math: new Map() });
}

/**
 * HTML der ersten `limit` Blöcke für Vorschaubilder (Startseite). Mermaid-Diagramme ohne
 * vorgerendertes SVG werden als Platzhalter gezeigt statt als Quelltext.
 */
export function previewHtml(doc: PMNode, assets: Assets, limit = 14): string {
  footnotes = [];
  allCollections = collectCollections(doc);
  return (doc.content ?? [])
    .slice(0, limit)
    .map((n) =>
      n.type === 'mermaid' && !assets.mermaid.get(n.attrs?.code)
        ? `<figure class="pv-placeholder">Diagramm</figure>`
        : block(n, assets),
    )
    .filter(Boolean)
    .join('\n');
}

const calloutHex: Record<CalloutColor, string> = {
  blue: '#1F6FD1',
  green: '#1F8A4C',
  purple: '#8250DF',
  amber: '#B8650A',
  red: '#D93A2B',
  teal: '#0E7268',
  orange: '#9A3412',
  pink: '#C11574',
  graphite: '#3F3F46',
};

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
blockquote{position:relative;margin:0 0 14px;padding:6px 0 6px 18px;color:var(--soft)}
blockquote::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:2px;background:var(--ink)}
hr{border:0;border-top:1px solid var(--line);margin:28px 0}
hr[data-variant="dotted"]{border-top:2px dotted var(--line)}
hr[data-variant="bold"]{border-top:3px solid var(--line)}
hr[data-variant="dots"]{border:0;height:1.4em;text-align:center;overflow:visible}
hr[data-variant="page"]{border:0;margin:0;break-after:page}
hr[data-variant="dots"]::before{content:'• • •';letter-spacing:.5em;color:var(--ink-faint)}
code{font:0.88em "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;background:var(--paper-2);padding:.1em .35em;border-radius:5px}
pre.code{background:#F6F6F4;color:#1F2328;border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow:auto;margin:0 0 16px;font-size:13.5px;line-height:1.55}
pre.code code{background:none;padding:0;font-size:inherit;white-space:pre}
mark.cloze{background:var(--accent-bg);color:var(--accent);border-radius:4px;padding:0 3px;font-weight:550}
figure{margin:0 0 18px}
figure.image{max-width:100%}
figure.image img{display:block;width:100%;max-width:100%;height:auto;border-radius:10px}
figure.image:not([style]) img{width:auto}
figure.image[data-align="center"]{margin-left:auto;margin-right:auto}
figure.image[data-align="right"]{margin-left:auto}
figure.image[data-layout="left"]{float:left;margin:4px 20px 12px 0}
figure.image[data-layout="right"]{float:right;margin:4px 0 12px 20px}
figure.image[data-frame="none"] img{border-radius:0}
figure.image[data-frame="border"] img{border-radius:6px;border:1px solid var(--line)}
figure.image[data-frame="round"] img{border-radius:24px}
figure.image[data-frame="circle"] img{border-radius:50%}
figure.gallery .gallery-grid{display:grid;gap:10px}
figure.gallery .gallery-grid figure{margin:0}
figure.gallery .gallery-grid img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px}
figure.gallery .gallery-grid figcaption{margin:4px 0 0;font-weight:400;text-align:center}
figcaption{font-size:13px;font-weight:600;color:var(--soft);margin-bottom:8px}
figure.image figcaption{margin:6px 0 0}
figure.mermaid svg{max-width:100%;height:auto}
figure.whiteboard img{display:block;max-width:100%;height:auto;margin:0 auto}
figure.svg>div{max-width:100%;margin:0 auto;border-radius:10px;box-sizing:border-box}
figure.svg img{display:block;width:100%;height:auto}
figure.svg[data-align="left"]>div{margin-left:0}
figure.svg[data-align="right"]>div{margin-right:0}
figure.svg[data-align="floatLeft"]{float:left;max-width:50%;margin:4px 20px 12px 0}
figure.svg[data-align="floatRight"]{float:right;max-width:50%;margin:4px 0 12px 20px}
figure.svg figcaption{text-align:center}
.callout{--tone:var(--blue);position:relative;margin:0 0 16px;padding:6px 0 6px 16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.callout::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:2px;background:var(--tone)}
.callout-style-background{padding:12px 16px;border-radius:10px;background:color-mix(in srgb,var(--tone) 11%,transparent)}
.callout-style-background::before{content:none}
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
figure.plot svg{margin:0 auto}
.plot-legend{list-style:none;display:flex;flex-wrap:wrap;gap:6px 16px;padding:0;margin:8px 0 0;font-size:14px}
.plot-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.plot-params{color:var(--soft)}
figure.tl ol{list-style:none;margin:0;padding:0 0 0 18px;border-left:2px solid var(--accent-bg)}
figure.tl li{position:relative;margin:0 0 12px}
figure.tl li::before{content:"";position:absolute;left:-24px;top:.45em;width:10px;height:10px;border-radius:50%;background:var(--accent)}
figure.tl li.period::before{border-radius:3px;height:16px;top:.3em}
.tl-date{display:block;font-size:13px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}
.tl-text{display:block;color:var(--soft);font-size:15px}
.glossary dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}
.glossary dl>div{display:contents}
.glossary dt{font-weight:700;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:14px}
.glossary dd{margin:0}
.glossary dd span{display:block;font-size:14px;color:var(--soft)}
kbd{font:0.85em ui-monospace,Menlo,Consolas,monospace;background:var(--paper-2);border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;padding:.05em .45em}
sub,sup{font-size:.75em}
.math-src{color:var(--soft)}
.math-block{margin:0 0 16px;text-align:center;overflow-x:auto}
.math-block .katex-display{margin:0}
.footnotes{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--soft)}
.footnotes h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px}
.footnotes ol{padding-left:1.3em;margin:0}
.footnotes li{margin-bottom:6px}
.footnotes a{margin-left:4px}
.fn-ref a{text-decoration:none}
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

function footnoteList(): string {
  if (!footnotes.length) return '';
  return `<section class="footnotes"><h2>Fußnoten</h2><ol>${footnotes
    .map((text, i) => `<li id="fn-${i + 1}">${esc(text) || '<em>leer</em>'} <a href="#fnref-${i + 1}">↩</a></li>`)
    .join('')}</ol></section>`;
}

/** Vollständiges, eigenständiges HTML-Dokument der Notiz (auch Grundlage für den PDF-Export). */
export function toHtml({ title, tags, doc, assets }: ExportDoc): string {
  const name = untitled(title);
  footnotes = [];
  allCollections = collectCollections(doc);
  const body = blocks(doc.content, assets);
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
${body}
${footnoteList()}
</main>
</body>
</html>
`;
}
