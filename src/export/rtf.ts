import { kindLabels, type DiagramItem, type DiagramKind } from '@/blocks/diagram/DiagramNode';
import type { Flashcard } from '@/blocks/flashcard/FlashcardsNode';
import type { QuizQuestion } from '@/blocks/quiz/QuizNode';
import { resolveCallout, type CalloutColor } from '@/editor/CalloutNode';
import { glossaryRows, plotSummary, timelineRows } from './extraBlocks';
import { collectCollections, collectionTables, imageAsset, noteBlockAsParagraph, smartLinkAsParagraph, tableRows, textOf, untitled, whiteboardTexts, type Assets, type ExportDoc, type PMMark, type PMNode } from './model';
import type { CollectionData } from '@/blocks/collection/model';

/** A4 mit 2 cm Rand: nutzbare Breite in Twips (1/1440 Zoll). */
const PAGE_W = 11906;
const MARGIN = 1134;
const TEXT_W = PAGE_W - 2 * MARGIN;

// Feste Farbtabelle; frei gewählte Textfarben werden hinten angehängt.
const BASE_COLORS: [number, number, number][] = [
  [28, 28, 30], // 1 Text
  [110, 110, 115], // 2 Grau
  [91, 91, 214], // 3 Akzent
  [31, 111, 209], // 4 Blau / Links
  [31, 138, 76], // 5 Grün
  [184, 101, 10], // 6 Bernstein
  [231, 231, 228], // 7 Linie
  [243, 243, 241], // 8 Kopfzeilen-Hintergrund
  [130, 80, 223], // 9 Lila
  [207, 34, 46], // 10 Rot
];
const C = { ink: 1, soft: 2, accent: 3, blue: 4, green: 5, amber: 6, line: 7, head: 8, purple: 9, red: 10 };
// Die Palette ist klein – zusätzliche Farben auf den nächsten Ton abbilden.
const calloutColor: Record<CalloutColor, number> = { blue: C.blue, green: C.green, purple: C.purple, amber: C.amber, red: C.red, teal: C.green, orange: C.amber, pink: C.red, graphite: C.soft };

/** RTF kennt nur 7-Bit: Sonderzeichen als \uN? (UTF-16-Einheiten, vorzeichenbehaftet). */
function esc(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x5c || c === 0x7b || c === 0x7d) out += `\\${s[i]}`;
    else if (c === 0x0a) out += '\\line ';
    else if (c === 0x09) out += '\\tab ';
    else if (c < 0x80) out += s[i];
    else out += `\\u${c > 0x7fff ? c - 0x10000 : c}?`;
  }
  return out;
}

function parseColor(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string') return null;
  let m = /^#([0-9a-f]{3})$/i.exec(value);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16)) as [number, number, number];
  m = /^#([0-9a-f]{6})/i.exec(value);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as [number, number, number];
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(value);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

interface Box {
  /** Linker Einzug in Twips. */
  indent: number;
  /** Aufzählungszeichen für den ersten Absatz (hängender Einzug). */
  marker?: string;
  /** Zusätzliche Absatz-/Zeichenformate, z. B. für Zitate. */
  style?: string;
}

class RtfWriter {
  colors = [...BASE_COLORS];
  /** Fußnoten in Dokument-Reihenfolge – ihr Index (+1) ist ihre Nummer. */
  footnotes: string[] = [];
  /** Alle Sammlungen der Notiz – für Verknüpfungsfelder, deren Zielblatt in einer anderen Sammlung liegt. */
  private allCollections: CollectionData[];
  constructor(
    private assets: Assets,
    doc?: PMNode,
  ) {
    this.allCollections = doc ? collectCollections(doc) : [];
  }

  color(value: unknown): number | null {
    const rgb = parseColor(value);
    if (!rgb) return null;
    const i = this.colors.findIndex((c) => c.every((v, k) => v === rgb[k]));
    if (i >= 0) return i + 1;
    this.colors.push(rgb);
    return this.colors.length;
  }

  markCodes(marks: PMMark[]): string {
    let s = '';
    for (const m of marks) {
      if (m.type === 'bold') s += '\\b';
      else if (m.type === 'italic') s += '\\i';
      else if (m.type === 'underline') s += '\\ul';
      else if (m.type === 'strike') s += '\\strike';
      else if (m.type === 'code') s += '\\f1\\fs21';
      else if (m.type === 'cloze') s += `\\b\\ul\\cf${C.accent}`;
      else if (m.type === 'kbd') s += `\\f1\\fs19\\cbpat${C.head}`;
      else if (m.type === 'subscript') s += '\\sub';
      else if (m.type === 'superscript') s += '\\super';
      else if (m.type === 'textStyle') {
        const c = this.color(m.attrs?.color);
        if (c) s += `\\cf${c}`;
      }
    }
    return s;
  }

  inline(nodes: PMNode[] = []): string {
    return nodes
      .map((n) => {
        if (n.type === 'hardBreak') return '\\line ';
        if (n.type === 'mathInline') return `{\\f1\\fs21\\cf${C.soft} ${esc(String(n.attrs?.latex ?? ''))}}`;
        if (n.type === 'footnote') {
          const num = this.footnotes.push(String(n.attrs?.text ?? ''));
          return `{\\super\\cf${C.accent} ${num}}`;
        }
        if (n.type !== 'text' || !n.text) return '';
        const marks = n.marks ?? [];
        // Leerzeichen nur als Trenner hinter Steuerwörtern – ohne sie wäre es echter Text.
        const codes = this.markCodes(marks);
        const run = codes ? `{${codes} ${esc(n.text)}}` : esc(n.text);
        const link = marks.find((m) => m.type === 'link');
        if (!link) return run;
        const href = String(link.attrs?.href ?? '').replace(/["\\]/g, '');
        return `{\\field{\\*\\fldinst{HYPERLINK "${href}"}}{\\fldrslt{\\ul\\cf${C.blue} ${run}}}}`;
      })
      .join('');
  }

  /** Ein Absatz; `fmt` enthält Absatz- und Zeichenformate. */
  para(content: string, box: Box, fmt = '', after = 120): string {
    const hang = box.marker !== undefined;
    const li = box.indent + (hang ? 360 : 0);
    const lead = hang ? `${esc(box.marker!)}\\tab ` : '';
    return `\\pard\\plain\\f0\\fs24\\cf${C.ink}\\sl300\\slmult1\\sa${after}\\li${li}${hang ? `\\fi-360\\tx${li}` : ''}${box.style ?? ''}${fmt} ${lead}${content}\\par\n`;
  }

  table(rows: string[][], header: boolean, indent: number): string {
    if (rows.length === 0) return '';
    const cols = Math.max(...rows.map((r) => r.length));
    const w = Math.floor((TEXT_W - indent) / cols);
    const border = ['t', 'l', 'b', 'r'].map((s) => `\\clbrdr${s}\\brdrs\\brdrw10\\brdrcf${C.line}`).join('');
    return (
      rows
        .map((r, ri) => {
          const head = header && ri === 0;
          const defs = Array.from({ length: cols }, (_, i) => `${border}${head ? `\\clcbpat${C.head}` : ''}\\cellx${indent + w * (i + 1)}`).join('');
          const cells = Array.from({ length: cols }, (_, i) => `\\pard\\intbl\\plain\\f0\\fs22\\cf${C.ink}${head ? '\\b' : ''} ${r[i] ?? ''}\\cell`).join('');
          return `\\trowd\\trgaph108\\trleft${indent}${defs}\n${cells}\\row\n`;
        })
        .join('') + this.para('', { indent }, '\\fs8', 0)
    );
  }

  image(src: string, box: Box, edit?: Parameters<typeof imageAsset>[2], widthPct?: number | null): string {
    const img = src ? imageAsset(this.assets, src, edit) : undefined;
    if (!img?.png || !img.width) return '';
    const maxW = TEXT_W - box.indent;
    // Breite in Prozent der Textbreite (wie im Editor), sonst Originalgröße.
    const tw = widthPct && widthPct > 0 ? Math.round((maxW * Math.min(100, widthPct)) / 100) : Math.min(maxW, img.width * 15);
    const th = Math.round((tw / img.width) * img.height);
    let hex = '';
    for (const b of img.png) hex += b.toString(16).padStart(2, '0');
    const pict = `{\\pict\\pngblip\\picw${img.width}\\pich${img.height}\\picwgoal${tw}\\pichgoal${th}\n${hex.replace(/(.{128})/g, '$1\n')}}`;
    return this.para(pict, box, '', 200);
  }

  blocks(nodes: PMNode[] | undefined, box: Box): string {
    // Folgeblöcke eines Listenpunkts stehen auf Höhe seines Textes, nicht des Aufzählungszeichens.
    const rest: Box = { ...box, indent: box.indent + (box.marker !== undefined ? 360 : 0), marker: undefined };
    return (nodes ?? []).map((n, i) => this.block(n, i === 0 ? box : rest)).join('');
  }

  list(items: PMNode[] | undefined, box: Box, marker: (i: number, li: PMNode) => string): string {
    return (items ?? []).map((li, i) => this.blocks(li.content, { indent: box.indent + (box.marker !== undefined ? 360 : 0), marker: marker(i, li), style: box.style })).join('');
  }

  block(n: PMNode, box: Box): string {
    const a = n.attrs ?? {};
    const align = a.textAlign === 'center' ? '\\qc' : a.textAlign === 'right' ? '\\qr' : a.textAlign === 'justify' ? '\\qj' : '';
    switch (n.type) {
      case 'paragraph': {
        const content = this.inline(n.content);
        if (!content && box.marker === undefined) return '';
        const variant = a.variant === 'strong' ? '\\b' : a.variant === 'caption' ? `\\fs20\\cf${C.soft}` : '';
        return this.para(content, box, align + variant);
      }
      case 'heading': {
        const size = [0, 40, 32, 27][a.level ?? 1] ?? 27;
        return this.para(this.inline(n.content), box, `${align}\\b\\fs${size}\\sb${a.level === 1 ? 360 : 240}\\keepn`, 100);
      }
      case 'bulletList':
        return this.list(n.content, box, () => '•');
      case 'orderedList': {
        const start = Number(a.start ?? 1);
        return this.list(n.content, box, (i) => `${start + i}.`);
      }
      case 'taskList':
        return this.list(n.content, box, (_, li) => (li.attrs?.checked ? '☑' : '☐'));
      case 'blockquote':
        return this.blocks(n.content, { ...box, indent: box.indent + 360, style: `${box.style ?? ''}\\i\\cf${C.soft}` });
      case 'callout': {
        const c = resolveCallout(a);
        const cf = calloutColor[c.color];
        const bar = `\\brdrl\\brdrs\\brdrw40\\brdrcf${cf}\\brsp160`;
        const inner: Box = { indent: box.indent + 240, style: bar };
        return this.para(esc(c.title), { ...inner, marker: undefined }, `\\b\\fs18\\cf${cf}\\sb60`, 40) + this.blocks(n.content, inner);
      }
      case 'toggleBlock':
        return this.para(esc(a.summary || 'Aufklappen'), { ...box, marker: box.marker ?? '▸' }, '\\b', 60) + this.blocks(n.content, { indent: box.indent + 360 });
      case 'noteBlock':
        return this.block(noteBlockAsParagraph(n), box);
      case 'smartLink':
        return this.block(smartLinkAsParagraph(n), box);
      case 'mathBlock': {
        const latex = String(a.latex ?? '').trim();
        if (!latex) return '';
        return this.para(esc(latex), box, `\\qc\\f1\\fs21\\cf${C.soft}`, 200);
      }
      case 'horizontalRule':
        if (a.variant === 'page') return '\\pard\\plain\\page\\par\n';
        return `\\pard\\plain\\li${box.indent}\\brdrb\\brdrs\\brdrw10\\brdrcf${C.line}\\sa240\\fs8 \\par\n`;
      case 'codeBlock': {
        const code = textOf(n).replace(/\n+$/, '');
        return this.para(esc(code), { indent: box.indent + 240 }, `\\f1\\fs19\\sl260\\slmult1\\cbpat${C.head}`, 200);
      }
      case 'image':
        return this.image(a.src, box, a.edit, a.width) + (a.title ? this.para(esc(String(a.title)), box, `\\fs20\\cf${C.soft}`, 160) : '');
      case 'gallery': {
        const items = (a.items ?? []) as { src: string; caption?: string; edit?: Parameters<typeof imageAsset>[2] }[];
        return (
          (a.title ? this.para(esc(String(a.title)), box, `\\b\\fs20\\cf${C.soft}\\keepn`, 80) : '') +
          items
            .map((it) => this.image(it.src, box, it.edit, 50) + (a.captions !== false && it.caption ? this.para(esc(it.caption), box, `\\fs20\\cf${C.soft}`, 160) : ''))
            .join('')
        );
      }
      case 'flashcards': {
        const cards = (a.cards ?? []) as Flashcard[];
        return (
          this.para(esc(a.title || 'Karteikarten'), box, `\\b\\fs20\\cf${C.soft}\\keepn`, 80) +
          this.table([['Vorderseite', 'Rückseite'].map(esc), ...cards.map((c) => [esc(c.front), esc(c.back)])], true, box.indent)
        );
      }
      case 'quiz': {
        const qs = (a.questions ?? []) as QuizQuestion[];
        return (
          this.para('QUIZ', box, `\\b\\fs18\\cf${C.soft}\\keepn`, 80) +
          qs
            .map(
              (q, qi) =>
                this.para(esc(q.question), { indent: box.indent, marker: `${qi + 1}.` }, '\\b\\keepn', 60) +
                q.options
                  .map((o, i) => this.para(esc(o), { indent: box.indent + 360, marker: i === q.correct ? '✓' : '○' }, i === q.correct ? `\\b\\cf${C.green}` : '', 40))
                  .join('') +
                (q.why ? this.para(`{\\b Erkl\\u228?rung:} ${esc(q.why)}`, { indent: box.indent + 360 }, `\\fs21\\cf${C.soft}`) : '')
            )
            .join('')
        );
      }
      case 'diagram': {
        const kind = (a.kind ?? 'steps') as DiagramKind;
        const items = (a.items ?? []) as DiagramItem[];
        const numbered = kind === 'steps' || kind === 'cycle';
        return (
          this.para(esc(a.title ? `${a.title} (${kindLabels[kind]})` : kindLabels[kind]), box, '\\b\\keepn', 80) +
          items
            .map((it, i) => {
              const text = it.text || (it.value !== undefined ? String(it.value) : '');
              return this.para(`{\\b ${esc(it.label)}}${text ? esc(numbered ? ` – ${text}` : `: ${text}`) : ''}`, { indent: box.indent, marker: numbered ? `${i + 1}.` : '•' }, '', 60);
            })
            .join('')
        );
      }
      case 'mermaid': {
        const code = String(a.code ?? '').trim();
        if (!code) return '';
        return this.para('Mermaid-Diagramm', box, `\\b\\fs20\\cf${C.soft}\\keepn`, 60) + this.para(esc(code), { indent: box.indent + 240 }, `\\f1\\fs19\\cbpat${C.head}`, 200);
      }
      case 'svg': {
        if (!a.svg) return '';
        const label = String(a.caption || a.alt || '').trim();
        return this.para(esc(`[SVG-Grafik${label ? `: ${label}` : ''}]`), box, `\\i\\fs20\\cf${C.soft}`, 60);
      }
      case 'whiteboard': {
        const texts = whiteboardTexts(a.scene);
        if (!texts.length && !a.svg) return '';
        return this.para('Whiteboard', box, `\\b\\fs20\\cf${C.soft}\\keepn`, 60) + texts.map((t) => this.para(esc(t), { indent: box.indent + 240 }, '', 40)).join('');
      }
      case 'table': {
        const rows = tableRows(n);
        const header = rows[0]?.every((c) => c.type === 'tableHeader') ?? false;
        return this.table(
          rows.map((r) => r.map((c) => (c.content ?? []).map((p) => this.inline(p.content)).join('\\line '))),
          header,
          box.indent,
        );
      }
      case 'plot': {
        const p = plotSummary(n);
        if (!p.fns.length) return '';
        return (
          this.para(esc(p.title || 'Funktionsplotter'), box, '\\b\\keepn', 80) +
          p.fns.map((f) => this.para(`${esc(f.name)} = {\\f1 ${esc(f.expr)}}`, { indent: box.indent, marker: '•' }, '', 40)).join('') +
          (p.params ? this.para(esc(p.params), { indent: box.indent + 360 }, `\\fs21\\cf${C.soft}`) : '')
        );
      }
      case 'timeline': {
        const t = timelineRows(n);
        if (!t.rows.length) return '';
        return (
          this.para(esc(t.title || 'Zeitstrahl'), box, '\\b\\keepn', 80) +
          t.rows.map((r) => this.para(`{\\b ${esc(r.date)}}  ${esc(r.title)}${r.text ? esc(` – ${r.text}`) : ''}`, { indent: box.indent, marker: '•' }, '', 60)).join('')
        );
      }
      case 'glossaryList': {
        const g = glossaryRows(n, this.assets);
        if (!g || !g.rows.length) return '';
        return (
          this.para(esc(g.title), box, `\\b\\fs20\\cf${C.soft}\\keepn`, 80) +
          this.table([['Begriff', 'Bedeutung'], ...g.rows.map((t) => [esc(t.term), esc(t.definition ? `${t.expansion} – ${t.definition}` : t.expansion)])], true, box.indent)
        );
      }
      case 'collection':
        return collectionTables(a.data, this.allCollections)
          .map((t) => this.para(esc(t.name), box, `\\b\\fs20\\cf${C.soft}\\keepn`, 80) + this.table(t.rows.map((r) => r.map(esc)), true, box.indent))
          .join('');
      default:
        return n.content ? this.blocks(n.content, box) : '';
    }
  }
}

/** Rich Text Format – öffnet sich in TextEdit, Pages, Word und LibreOffice. */
export function toRtf({ title, tags, doc, assets }: ExportDoc): string {
  const w = new RtfWriter(assets, doc);
  const body =
    w.para(esc(untitled(title)), { indent: 0 }, '\\b\\fs52', tags.length ? 80 : 280) +
    (tags.length ? w.para(esc(tags.join('  ·  ')), { indent: 0 }, `\\fs20\\cf${C.accent}`, 280) : '') +
    w.blocks(doc.content, { indent: 0 });
  const notes = w.footnotes.length
    ? `\\pard\\plain\\brdrt\\brdrs\\brdrw10\\brdrcf${C.line}\\sa0\\sb280\\fs8 \\par\n` +
      w.footnotes.map((text, i) => w.para(esc(text), { indent: 0, marker: `${i + 1}.` }, `\\fs20\\cf${C.soft}`, 60)).join('')
    : '';
  const colortbl = `{\\colortbl;${w.colors.map(([r, g, b]) => `\\red${r}\\green${g}\\blue${b};`).join('')}}`;
  const info = `{\\info{\\title ${esc(untitled(title))}}}`;
  return `{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica;}{\\f1\\fmodern\\fcharset0 Menlo;}}\n${colortbl}\n${info}\n\\paperw${PAGE_W}\\paperh16838\\margl${MARGIN}\\margr${MARGIN}\\margt${MARGIN}\\margb${MARGIN}\\widowctrl\n${body}${notes}}`;
}
