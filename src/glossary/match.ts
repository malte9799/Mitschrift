/** Reine Hilfsfunktionen fürs Glossar – ohne React/Speicher, damit auch der Export sie nutzen kann. */

export interface TermLike {
  id: string;
  term: string;
  expansion: string;
  definition: string;
}

/** Abkürzungen (mind. zwei Großbuchstaben: DNS, IPv4, TCP/IP) werden groß/klein-genau erkannt, Wörter unabhängig davon. */
export const isCaseSensitive = (term: string) => (term.match(/\p{Lu}/gu)?.length ?? 0) >= 2;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Matcher {
  /** Treffer im Text: Position, Länge, Eintrag. */
  find(text: string): { index: number; length: number; term: TermLike }[];
}

const empty: Matcher = { find: () => [] };

/**
 * Baut einen Matcher für alle Begriffe. Längere Begriffe gewinnen („TCP/IP“ vor „TCP“),
 * Abkürzungen dürfen ein Plural-s tragen („APIs“, „VMs“).
 */
export function buildMatcher(terms: TermLike[]): Matcher {
  const valid = terms.filter((t) => t.term.trim());
  if (!valid.length) return empty;
  const sensitive = new Map<string, TermLike>();
  const insensitive = new Map<string, TermLike>();
  for (const t of valid) {
    const key = t.term.trim();
    if (isCaseSensitive(key)) sensitive.set(key, t);
    else insensitive.set(key.toLocaleLowerCase('de'), t);
  }
  const alt = (keys: string[], plural: boolean) =>
    keys
      .sort((a, b) => b.length - a.length)
      .map((k) => escapeRe(k) + (plural && /\p{Lu}$/u.test(k) ? 's?' : ''))
      .join('|');
  const wrap = (body: string, flags: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`, flags);
  const reS = sensitive.size ? wrap(alt([...sensitive.keys()], true), 'gu') : null;
  const reI = insensitive.size ? wrap(alt([...insensitive.keys()], false), 'giu') : null;

  return {
    find(text) {
      const out: { index: number; length: number; term: TermLike }[] = [];
      if (reS) {
        for (const m of text.matchAll(reS)) {
          const t = sensitive.get(m[0]) ?? sensitive.get(m[0].slice(0, -1));
          if (t) out.push({ index: m.index!, length: m[0].length, term: t });
        }
      }
      if (reI) {
        for (const m of text.matchAll(reI)) {
          const t = insensitive.get(m[0].toLocaleLowerCase('de'));
          if (t && !out.some((o) => m.index! < o.index + o.length && o.index < m.index! + m[0].length)) out.push({ index: m.index!, length: m[0].length, term: t });
        }
      }
      return out.sort((a, b) => a.index - b.index);
    },
  };
}

/** Begriffe, die im Text vorkommen – alphabetisch (für das Abkürzungsverzeichnis). */
export function termsInText<T extends TermLike>(terms: T[], text: string): T[] {
  const found = new Set(buildMatcher(terms).find(text).map((m) => m.term.id));
  return terms.filter((t) => found.has(t.id)).sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));
}

const FILLER = /^(of|and|for|the|to|in|on|over|via|a|an|der|die|das|des|dem|und|für|von|zur|zum|im|am|de)$/;

/**
 * Passen die Anfangsbuchstaben der Langform zur Abkürzung? „Domain Name System“ ↔ „DNS“.
 * Ein Wort darf mehrere Buchstaben liefern („Hypertext Transfer Protocol“ ↔ „HTTP“), Füllwörter dürfen fehlen.
 */
export function initialsMatch(abbr: string, long: string): boolean {
  const letters = abbr.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const words = long.toLowerCase().split(/[\s\-/]+/).filter(Boolean);
  if (letters.length < 2 || words.length < 2 || words.length > letters.length + 3) return false;
  const go = (li: number, wi: number): boolean => {
    if (wi === words.length) return li === letters.length;
    const w = words[wi];
    if (FILLER.test(w) && go(li, wi + 1)) return true;
    if (li >= letters.length || w[0] !== letters[li]) return false;
    let next = li + 1;
    if (go(next, wi + 1)) return true;
    let pos = 0;
    while (next < letters.length) {
      pos = w.indexOf(letters[next], pos + 1);
      if (pos < 0) return false;
      next++;
      if (go(next, wi + 1)) return true;
    }
    return false;
  };
  return go(0, 0);
}

/**
 * Aus einer Markierung einen Eintrag raten:
 * „Domain Name System (DNS)“, „DNS (Domain Name System)“, „DNS – Domain Name System“, „DNS: …“.
 */
export function guessTerm(text: string): { term: string; expansion: string } {
  const s = text.trim().replace(/\s+/g, ' ');
  let m = /^(.+?)\s*\(([^()]+)\)$/.exec(s);
  if (m) {
    const [a, b] = [m[1].trim(), m[2].trim()];
    return b.length < a.length ? { term: b, expansion: a } : { term: a, expansion: b };
  }
  m = /^([^\s:=–—-][^:=–—]{0,20}?)\s*(?::|=|–|—|\s-\s)\s*(.+)$/.exec(s);
  if (m) return { term: m[1].trim(), expansion: m[2].trim() };
  return { term: s, expansion: '' };
}

/**
 * Liest eine Liste zum Importieren. Eine Zeile pro Begriff:
 * `DNS – Domain Name System`, `DNS: …`, `DNS = …`, Tab- oder Semikolon-getrennt (Begriff; Langform; Erklärung),
 * Markdown-Tabellen (`| DNS | Domain Name System |`) und `Domain Name System (DNS)`.
 */
export function parseImport(text: string): { term: string; expansion: string; definition: string }[] {
  const out: { term: string; expansion: string; definition: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim().replace(/^[-*•]\s+/, '');
    if (!line || /^\|?\s*:?-{2,}/.test(line)) continue;
    let cells: string[] | null = null;
    if (line.startsWith('|')) cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    else if (line.includes('\t')) cells = line.split('\t').map((c) => c.trim());
    else if (line.includes(';')) cells = line.split(';').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells) {
      if (cells[0] && !/^(begriff|abkürzung|abk\.?|term|kürzel)$/i.test(cells[0])) out.push({ term: cells[0], expansion: cells[1] ?? '', definition: cells.slice(2).join(' ').trim() });
      continue;
    }
    line = line.replace(/\*\*/g, '');
    const g = guessTerm(line);
    if (g.term) out.push({ ...g, definition: '' });
  }
  return out;
}

/**
 * Sucht in Notiztexten nach „Langform (ABK)“ bzw. „ABK (Langform)“, bei denen die Anfangsbuchstaben passen –
 * Vorschläge für neue Glossar-Einträge.
 */
export function findSuggestions(texts: { noteId: string; text: string }[], known: Set<string>): { term: string; expansion: string; noteId: string }[] {
  const seen = new Map<string, { term: string; expansion: string; noteId: string }>();
  const longThenShort = /((?:[\p{L}][\p{L}\p{N}-]*[\s/]+){1,7}[\p{L}][\p{L}\p{N}-]*)\s*\(\s*([\p{Lu}][\p{L}\p{N}/&.-]{1,11})\s*\)/gu;
  const shortThenLong = /(?<![\p{L}\p{N}])([\p{Lu}][\p{Lu}\p{N}/&-]{1,11})\s*\(\s*([\p{L}][^()]{3,80}?)\s*\)/gu;
  for (const { noteId, text } of texts) {
    for (const m of text.matchAll(longThenShort)) {
      const abbr = m[2];
      if (!isCaseSensitive(abbr)) continue;
      // Von hinten die kürzeste passende Wortfolge nehmen – so bleibt „das“ in „das Domain Name System“ draußen.
      const words = m[1].trim().split(/\s+/);
      for (let n = 2; n <= Math.min(words.length, 8); n++) {
        const long = words.slice(-n).join(' ');
        if (initialsMatch(abbr, long)) {
          if (!known.has(abbr) && !seen.has(abbr)) seen.set(abbr, { term: abbr, expansion: long, noteId });
          break;
        }
      }
    }
    for (const m of text.matchAll(shortThenLong)) {
      const [abbr, long] = [m[1], m[2].trim()];
      if (isCaseSensitive(abbr) && initialsMatch(abbr, long) && !known.has(abbr) && !seen.has(abbr)) seen.set(abbr, { term: abbr, expansion: long, noteId });
    }
  }
  return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term, 'de'));
}
