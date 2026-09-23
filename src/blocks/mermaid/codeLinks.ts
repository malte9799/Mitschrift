/**
 * Verknüpft Mermaid-Code (Flowchart) mit den gerenderten SVG-Knoten:
 * welche Knoten stehen in einer Zeile, wo wird ein Knoten definiert, und wie ändert man sein Label.
 */

/** Knoten-ID aus einem gerenderten `g.node` (id = `<diagramm>-flowchart-<ID>-<zähler>`). */
export function nodeIdOf(el: Element): string | null {
  return /-flowchart-(.+)-\d+$/.exec(el.id)?.[1] ?? null;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ersetzt Labels, Kanten-Texte und Strings durch Leerzeichen, damit darin keine IDs gefunden werden. */
function mask(line: string) {
  const blank = (m: string) => ' '.repeat(m.length);
  return line.replace(/"[^"]*"/g, blank).replace(/\|[^|]*\||\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, blank);
}

function isComment(line: string) {
  return line.trimStart().startsWith('%%');
}

/** Alle Stellen (Offset im Code), an denen `id` als Knoten vorkommt – nicht in Labels. */
function occurrences(code: string, id: string) {
  const re = new RegExp(`(?<![\\w])${esc(id)}(?![\\w])`, 'g');
  const found: number[] = [];
  let offset = 0;
  for (const line of code.split('\n')) {
    if (!isComment(line)) for (const m of mask(line).matchAll(re)) found.push(offset + m.index);
    offset += line.length + 1;
  }
  return found;
}

/** Knoten-IDs (aus `known`), die in Zeile `lineIndex` vorkommen. */
export function idsInLine(code: string, lineIndex: number, known: Iterable<string>) {
  const line = code.split('\n')[lineIndex] ?? '';
  if (isComment(line)) return new Set<string>();
  const masked = mask(line);
  const ids = new Set<string>();
  for (const id of known) if (new RegExp(`(?<![\\w])${esc(id)}(?![\\w])`).test(masked)) ids.add(id);
  return ids;
}

// Längere Öffner zuerst, damit `((` nicht als `(` erkannt wird.
const SHAPES: [open: string, close: string[]][] = [
  ['(((', [')))']],
  ['((', ['))']],
  ['([', ['])']],
  ['[[', [']]']],
  ['[(', [')]']],
  ['{{', ['}}']],
  ['[/', ['/]', '\\]']],
  ['[\\', ['\\]', '/]']],
  ['[', [']']],
  ['(', [')']],
  ['{', ['}']],
  ['>', [']']],
];

/** `idPos`…`close` ist der ganze Ausdruck `A[Text]`, `start`…`end` nur der Text darin. */
type LabelDef = { idPos: number; start: number; end: number; close: number; text: string; quoted: boolean };

/** Liest ein Label direkt hinter der ID an `idPos` (`A[Text]`, `B("Text")` …). */
function labelAt(code: string, idPos: number, id: string): LabelDef | null {
  const after = idPos + id.length;
  const shape = SHAPES.find(([open]) => code.startsWith(open, after));
  if (!shape) return null;
  const start = after + shape[0].length;
  const lineEnd = code.indexOf('\n', start) === -1 ? code.length : code.indexOf('\n', start);
  const closeAt = (i: number) => i + (shape[1].find((c) => code.startsWith(c, i))?.length ?? 0);
  if (code[start] === '"') {
    const q = code.indexOf('"', start + 1);
    if (q !== -1 && q < lineEnd) return { idPos, start, end: q + 1, close: closeAt(q + 1), text: code.slice(start + 1, q), quoted: true };
  }
  const ends = shape[1].map((c) => code.indexOf(c, start)).filter((i) => i !== -1 && i < lineEnd);
  if (!ends.length) return null;
  const end = Math.min(...ends);
  return { idPos, start, end, close: closeAt(end), text: code.slice(start, end), quoted: false };
}

/** Findet die Stelle, an der der Knoten sein Label bekommt (`A[Text]`). */
function labelDef(code: string, id: string): LabelDef | null {
  for (const idPos of occurrences(code, id)) {
    const def = labelAt(code, idPos, id);
    if (def) return def;
  }
  return null;
}

export type Span = { start: number; end: number };

/** Was beim Klick auf einen Knoten markiert wird: die Definition `A[Text]`, sonst das erste Vorkommen. */
export function nodeSpan(code: string, id: string): Span | null {
  const def = labelDef(code, id);
  if (def) return { start: def.idPos, end: def.close };
  const pos = occurrences(code, id)[0];
  return pos === undefined ? null : { start: pos, end: pos + id.length };
}

/** Knoten, in dessen Ausdruck (`A` oder `A[Text]`) die Position liegt. */
export function nodeAt(code: string, pos: number, known: Iterable<string>): string | null {
  for (const id of known) {
    for (const at of occurrences(code, id)) {
      const end = labelAt(code, at, id)?.close ?? at + id.length;
      if (pos >= at && pos <= end) return id;
    }
  }
  return null;
}

/** Aktueller Label-Text eines Knotens im Code (ohne Anführungszeichen); ohne Label die ID. */
export function nodeLabel(code: string, id: string) {
  return labelDef(code, id)?.text ?? id;
}

/** Setzt das Label eines Knotens im Code; fehlt es, wird `[Text]` an das erste Vorkommen gehängt. */
export function setNodeLabel(code: string, id: string, text: string) {
  const needsQuotes = /["[\](){}|<>]/.test(text);
  const value = needsQuotes ? `"${text.replace(/"/g, '#quot;')}"` : text;
  const def = labelDef(code, id);
  if (def) return code.slice(0, def.start) + (def.quoted && !needsQuotes ? `"${text}"` : value) + code.slice(def.end);
  const pos = occurrences(code, id)[0];
  if (pos === undefined) return code;
  const end = pos + id.length;
  return `${code.slice(0, end)}[${value}]${code.slice(end)}`;
}

// ─── Kanten ────────────────────────────────────────────────────────────────

export type EdgeRef = { from: string; to: string; index: number };

/** Zerlegt eine Kanten-ID (`L_<von>_<nach>_<n>`) anhand der bekannten Knoten-IDs. */
export function edgeRefOf(eid: string, known: Iterable<string>): EdgeRef | null {
  const ids = [...known];
  for (const from of ids) {
    if (!eid.startsWith(`L_${from}_`)) continue;
    const rest = eid.slice(from.length + 3);
    for (const to of ids) {
      const n = rest.startsWith(`${to}_`) ? rest.slice(to.length + 1) : '';
      if (/^\d+$/.test(n)) return { from, to, index: Number(n) };
    }
  }
  return null;
}

type Label = { start: number; end: number; text: string; quoted: boolean };
/** `pos`…`end` ist der ganze Pfeil samt Text (`-->|Text|`, `-- Text -->`). */
type EdgeLoc = { pos: number; end: number; label: Label | null; insertAt: number };

const ARROW_START = /<?(--|==|-\.|~~)/;
// `-- Text -->` zählt als ein Pfeil, nicht als zwei.
const TEXT_ARROW = /(--|==|-\.)\s[^\n]*?\s(-{2,}[>ox]|={2,}[>ox]|\.-+[>ox]?|-{3,}|={3,})/g;
const ARROWS = /<?(--|==|-\.|~~)[-=.~]*[>ox]?/g;

/** Findet eine Kante im Code; auch in Ketten (`A --> B --> C`) und mit `&`. */
export function edgeLocation(code: string, { from, to, index }: EdgeRef): EdgeLoc | null {
  const found: number[] = [];
  let offset = 0;
  for (const line of code.split('\n')) {
    if (!isComment(line)) {
      const masked = mask(line);
      const tok = (id: string) => [...masked.matchAll(new RegExp(`(?<![\\w])${esc(id)}(?![\\w])`, 'g'))].map((m) => m.index);
      for (const f of tok(from)) {
        for (const t of tok(to)) {
          if (t <= f) continue;
          const seg = masked.slice(f + from.length, t);
          // Genau ein Pfeil dazwischen – sonst liegt noch ein Knoten der Kette dazwischen.
          if (seg.replace(TEXT_ARROW, '--').match(ARROWS)?.length !== 1) continue;
          const a = ARROW_START.exec(seg);
          if (a) found.push(offset + f + from.length + a.index);
        }
      }
    }
    offset += line.length + 1;
  }
  const pos = found[index] ?? found[0];
  if (pos === undefined) return null;

  const lineEnd = code.indexOf('\n', pos) === -1 ? code.length : code.indexOf('\n', pos);
  const rest = code.slice(pos, lineEnd);
  const text = /^(<?(?:--|==|-\.))(\s+)(.+?)\s+(?:-{2,}[>ox]|={2,}[>ox]|\.-+[>ox]?|-{3,}|={3,})/.exec(rest);
  if (text) {
    const start = pos + text[1].length + text[2].length;
    return { pos, end: pos + text[0].length, label: unquote(code, start, start + text[3].length), insertAt: start };
  }
  const arrow = /^<?(?:--|==|-\.|~~)[-=.~]*[>ox]?/.exec(rest)!;
  const insertAt = pos + arrow[0].length;
  const pipe = /^\s*\|([^|]*)\|/.exec(code.slice(insertAt, lineEnd));
  if (pipe) {
    const start = insertAt + pipe[0].indexOf('|') + 1;
    return { pos, end: insertAt + pipe[0].length, label: unquote(code, start, start + pipe[1].length), insertAt };
  }
  return { pos, end: insertAt, label: null, insertAt };
}

function unquote(code: string, start: number, end: number): Label {
  const raw = code.slice(start, end);
  const quoted = raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"');
  return { start, end, text: quoted ? raw.slice(1, -1) : raw, quoted };
}

export function edgeLabel(code: string, ref: EdgeRef) {
  return edgeLocation(code, ref)?.label?.text ?? '';
}

/** Setzt den Text einer Kante; ohne Text wird `|Text|` hinter den Pfeil gesetzt. Leer entfernt ihn. */
export function setEdgeLabel(code: string, ref: EdgeRef, text: string) {
  const loc = edgeLocation(code, ref);
  if (!loc) return code;
  const needsQuotes = /["|[\](){}<>]/.test(text);
  const value = needsQuotes || loc.label?.quoted ? `"${text.replace(/"/g, '#quot;')}"` : text;
  if (loc.label) {
    const isPipe = code[loc.label.start - 1] === '|';
    if (!text && isPipe) return code.slice(0, code.lastIndexOf('|', loc.label.start - 1)).trimEnd() + code.slice(loc.label.end + 1);
    return code.slice(0, loc.label.start) + value + code.slice(loc.label.end);
  }
  if (!text) return code;
  return `${code.slice(0, loc.insertAt)}|${value}|${code.slice(loc.insertAt)}`;
}
