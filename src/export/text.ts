import { kindLabels, type DiagramItem, type DiagramKind } from '@/blocks/diagram/DiagramNode';
import type { Flashcard } from '@/blocks/flashcard/FlashcardsNode';
import type { QuizQuestion } from '@/blocks/quiz/QuizNode';
import { calloutVariant } from '@/editor/CalloutNode';
import { calloutLabels, collectionTables, tableRows, textOf, untitled, type Assets, type ExportDoc, type PMMark, type PMNode } from './model';

/** Markdown und reiner Text teilen sich den Aufbau, nur die Auszeichnung unterscheidet sich. */
type Mode = 'md' | 'txt';

interface Ctx {
  mode: Mode;
  assets: Assets;
  /** In Tabellenzellen: keine Zeilenumbrüche, `|` maskieren. */
  inCell?: boolean;
  /** Überschriften eine Ebene tiefer, weil der Notiztitel `#` belegt (Datei-Export). */
  shiftHeadings?: boolean;
}

// ---------- Inline ----------

const MARK_ORDER = ['link', 'bold', 'italic', 'underline', 'strike', 'cloze', 'code'];

function delims(m: PMMark): [string, string] {
  switch (m.type) {
    case 'bold':
      return ['**', '**'];
    case 'italic':
      return ['*', '*'];
    case 'underline':
      return ['<u>', '</u>'];
    case 'strike':
      return ['~~', '~~'];
    case 'cloze':
      return ['==', '=='];
    case 'code':
      return ['`', '`'];
    case 'link':
      return ['[', `](${String(m.attrs?.href ?? '').replace(/[()\s]/g, encodeURIComponent)})`];
    default:
      return ['', ''];
  }
}

const sameMark = (a: PMMark, b: PMMark) => a.type === b.type && (a.type !== 'link' || a.attrs?.href === b.attrs?.href);
const escMd = (s: string) => s.replace(/([\\`*_[\]<|])/g, '\\$1');

/** Markdown-Inline mit Marken-Stapel, damit aufeinanderfolgende Textstücke nicht `****` erzeugen. */
function inlineMd(nodes: PMNode[] = [], ctx: Ctx): string {
  let out = '';
  const stack: PMMark[] = [];

  const closeTo = (depth: number) => {
    if (stack.length <= depth) return;
    // Leerzeichen gehören hinter den schließenden Marker, sonst greift er nicht.
    const trail = /\s+$/.exec(out)?.[0] ?? '';
    out = out.slice(0, out.length - trail.length);
    while (stack.length > depth) out += delims(stack.pop()!)[1];
    out += trail;
  };

  for (const n of nodes) {
    if (n.type === 'hardBreak') {
      closeTo(0);
      out += ctx.inCell ? '<br>' : '\\\n';
      continue;
    }
    if (n.type !== 'text' || !n.text) continue;
    const marks = (n.marks ?? []).filter((m) => MARK_ORDER.includes(m.type)).sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
    let keep = 0;
    while (keep < stack.length && keep < marks.length && sameMark(stack[keep], marks[keep])) keep++;
    closeTo(keep);

    let text = n.text;
    if (!text.trim()) {
      out += text;
      continue;
    }
    const lead = /^\s+/.exec(text)?.[0] ?? '';
    out += lead;
    text = text.slice(lead.length);
    for (const m of marks.slice(keep)) {
      out += delims(m)[0];
      stack.push(m);
    }
    const inCode = stack.some((m) => m.type === 'code');
    out += inCode ? text : escMd(text);
  }
  closeTo(0);
  return ctx.inCell ? out.replace(/\n/g, ' ') : out;
}

function inline(nodes: PMNode[] | undefined, ctx: Ctx): string {
  if (ctx.mode === 'md') return inlineMd(nodes, ctx);
  const s = (nodes ?? []).map((n) => (n.type === 'hardBreak' ? '\n' : n.text ?? '')).join('');
  return ctx.inCell ? s.replace(/\n/g, ' ') : s;
}

// ---------- Hilfen ----------

/** Setzt `marker` vor die erste Zeile und rückt Folgezeilen passend ein. */
function hang(body: string, marker: string): string {
  const pad = ' '.repeat(marker.length);
  return body
    .split('\n')
    .map((l, i) => (i === 0 ? marker + l : l ? pad + l : l))
    .join('\n');
}

const prefixLines = (body: string, prefix: string) =>
  body
    .split('\n')
    .map((l) => (l ? prefix + l : prefix.trimEnd()))
    .join('\n');

/** Zeichenbreite für die Spaltenausrichtung im reinen Text. */
const width = (s: string) => [...s].length;

function table(rows: string[][], ctx: Ctx): string {
  if (rows.length === 0) return '';
  const cols = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ''));
  if (ctx.mode === 'md') {
    const line = (r: string[]) => `| ${r.map((c) => c || ' ').join(' | ')} |`;
    return [line(norm[0]), `|${' --- |'.repeat(cols)}`, ...norm.slice(1).map(line)].join('\n');
  }
  const w = Array.from({ length: cols }, (_, i) => Math.max(...norm.map((r) => width(r[i]))));
  const line = (r: string[]) => r.map((c, i) => c + ' '.repeat(w[i] - width(c))).join('  ').trimEnd();
  return [line(norm[0]), w.map((n) => '─'.repeat(n)).join('  '), ...norm.slice(1).map(line)].join('\n');
}

const escCell = (s: string, ctx: Ctx) => (ctx.mode === 'md' ? escMd(s).replace(/\n/g, '<br>') : s.replace(/\n/g, ' '));

function label(text: string, ctx: Ctx): string {
  return ctx.mode === 'md' ? `**${escMd(text)}**` : text;
}

// ---------- Blöcke ----------

function blocks(nodes: PMNode[] | undefined, ctx: Ctx, sep = '\n\n'): string {
  return (nodes ?? [])
    .map((n) => block(n, ctx))
    .filter((s) => s !== '')
    .join(sep);
}

function listItems(items: PMNode[] | undefined, ctx: Ctx, marker: (i: number, item: PMNode) => string): string {
  return (items ?? []).map((li, i) => hang(blocks(li.content, ctx, '\n') || '', marker(i, li))).join('\n');
}

function block(n: PMNode, ctx: Ctx): string {
  const a = n.attrs ?? {};
  const md = ctx.mode === 'md';
  switch (n.type) {
    case 'paragraph': {
      let s = inline(n.content, ctx);
      if (!s.trim()) return '';
      if (md) {
        // Zeilenanfang, der sonst als Liste/Überschrift gelesen würde, maskieren.
        s = s.replace(/^(\s*)(#{1,6}\s|[-+>]\s|\d+[.)]\s)/, (_, sp: string, m: string) => `${sp}${m.replace(/^(\d+)([.)])/, '$1\\$2').replace(/^([#+>-])/, '\\$1')}`);
        if (a.variant === 'strong') s = `**${s}**`;
        if (a.variant === 'caption') s = `*${s}*`;
      }
      return s;
    }
    case 'heading': {
      const s = inline(n.content, ctx);
      if (!s.trim()) return '';
      const level = Math.min(6, (a.level ?? 1) + (ctx.shiftHeadings ? 1 : 0));
      if (md) return `${'#'.repeat(level)} ${s}`;
      return level === 2 ? `${s}\n${'='.repeat(width(s))}` : level === 3 ? `${s}\n${'-'.repeat(width(s))}` : s;
    }
    case 'bulletList':
      return listItems(n.content, ctx, () => (md ? '- ' : '• '));
    case 'orderedList': {
      const start = Number(a.start ?? 1);
      const last = String(start + (n.content?.length ?? 1) - 1).length;
      return listItems(n.content, ctx, (i) => `${start + i}.`.padEnd(last + 2));
    }
    case 'taskList':
      return listItems(n.content, ctx, (_, li) => (md ? `- [${li.attrs?.checked ? 'x' : ' '}] ` : li.attrs?.checked ? '☑ ' : '☐ '));
    case 'listItem':
    case 'taskItem':
      return blocks(n.content, ctx, '\n');
    case 'blockquote':
      return prefixLines(blocks(n.content, ctx), '> ');
    case 'callout': {
      const variant = calloutVariant(a.variant);
      const body = blocks(n.content, ctx);
      if (md) {
        // GitHub-Hinweisblöcke; andere Renderer zeigen ein normales Zitat.
        return prefixLines(`[!${variant.toUpperCase()}]\n${body}`, '> ');
      }
      return prefixLines(`${calloutLabels[variant]}:\n${body}`, '│ ');
    }
    case 'toggleBlock': {
      const body = blocks(n.content, ctx);
      if (md) return `<details>\n<summary>${escMd(a.summary || 'Aufklappen')}</summary>\n\n${body}\n\n</details>`;
      return `▸ ${a.summary || 'Aufklappen'}\n${prefixLines(body, '  ')}`;
    }
    case 'horizontalRule':
      return md ? '---' : '─'.repeat(40);
    case 'hardBreak':
      return '';
    case 'codeBlock': {
      const code = textOf(n).replace(/\n+$/, '');
      if (!md) return prefixLines(code, '    ');
      const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((m) => m.length));
      const fence = '`'.repeat(longest + 1);
      return `${fence}${a.language ?? ''}\n${code}\n${fence}`;
    }
    case 'image': {
      // Ohne vorbereitete Assets (Zwischenablage): Web-Bilder direkt verlinken, lokale weglassen.
      const url = ctx.assets.images.get(a.src)?.url ?? (a.src && !String(a.src).startsWith('file:') ? a.src : '');
      const alt = a.alt || a.title || 'Bild';
      if (!md) return `[Bild: ${alt}]`;
      return url ? `![${escMd(alt)}](${url})` : '';
    }
    case 'flashcards': {
      const cards = (a.cards ?? []) as Flashcard[];
      const rows = [['Vorderseite', 'Rückseite'], ...cards.map((c) => [escCell(c.front, ctx), escCell(c.back, ctx)])];
      return `${label(a.title || 'Karteikarten', ctx)}\n\n${table(rows, ctx)}`;
    }
    case 'quiz': {
      const qs = (a.questions ?? []) as QuizQuestion[];
      const body = qs
        .map((q, qi) => {
          const opts = q.options
            .map((o, i) => (md ? `- [${i === q.correct ? 'x' : ' '}] ${escMd(o)}` : `${i === q.correct ? '✓' : '○'} ${o}`))
            .join('\n');
          const why = q.why ? `\n\n${md ? `*Erklärung:* ${escMd(q.why)}` : `Erklärung: ${q.why}`}` : '';
          return hang(`${md ? escMd(q.question) : q.question}\n\n${opts}${why}`, `${qi + 1}. `);
        })
        .join('\n\n');
      return `${label('Quiz', ctx)}\n\n${body}`;
    }
    case 'diagram': {
      const kind = (a.kind ?? 'steps') as DiagramKind;
      const items = (a.items ?? []) as DiagramItem[];
      const head = label(a.title ? `${a.title} (${kindLabels[kind]})` : kindLabels[kind], ctx);
      const line = (i: DiagramItem) => {
        const text = i.text || (i.value !== undefined ? String(i.value) : '');
        const l = md ? `**${escMd(i.label)}**` : i.label;
        return text ? `${l}${kind === 'steps' || kind === 'cycle' ? ' – ' : ': '}${md ? escMd(text) : text}` : l;
      };
      const list =
        kind === 'steps' || kind === 'cycle'
          ? items.map((i, idx) => `${idx + 1}. ${line(i)}`).join('\n')
          : items.map((i) => `${md ? '-' : '•'} ${line(i)}`).join('\n');
      return `${head}\n\n${list}${kind === 'cycle' && items.length ? `\n\n${md ? '*' : ''}↻ und wieder von vorn${md ? '*' : ''}` : ''}`;
    }
    case 'mermaid': {
      const code = String(a.code ?? '').trim();
      if (!code) return '';
      return md ? `\`\`\`mermaid\n${code}\n\`\`\`` : `[Mermaid-Diagramm]\n${prefixLines(code, '    ')}`;
    }
    case 'table': {
      const cellCtx = { ...ctx, inCell: true };
      const rows = tableRows(n).map((r) => r.map((c) => blocks(c.content, cellCtx, md ? '<br>' : ' ')));
      return table(rows, ctx);
    }
    case 'collection':
      return collectionTables(a.data)
        .map((t) => `${label(t.name, ctx)}\n\n${table(t.rows.map((r) => r.map((c) => escCell(c, ctx))), ctx)}`)
        .join('\n\n');
    default:
      return n.content ? blocks(n.content, ctx) : '';
  }
}

export function toMarkdown({ title, tags, doc, assets }: ExportDoc): string {
  const ctx: Ctx = { mode: 'md', assets, shiftHeadings: true };
  const head = [`# ${escMd(untitled(title))}`, tags.length ? tags.map((t) => `\`${t}\``).join(' ') : ''].filter(Boolean).join('\n\n');
  return `${[head, blocks(doc.content, ctx)].filter(Boolean).join('\n\n')}\n`;
}

/** Blöcke ohne Titel als Markdown – für die Zwischenablage. */
export function blocksToMarkdown(nodes: PMNode[]): string {
  return blocks(nodes, { mode: 'md', assets: { images: new Map(), mermaid: new Map() } });
}

export function toPlainText({ title, tags, doc, assets }: ExportDoc): string {
  const ctx: Ctx = { mode: 'txt', assets, shiftHeadings: true };
  const name = untitled(title);
  const head = [`${name}\n${'═'.repeat(width(name))}`, tags.length ? tags.join(' · ') : ''].filter(Boolean).join('\n');
  return `${[head, blocks(doc.content, ctx)].filter(Boolean).join('\n\n')}\n`;
}
