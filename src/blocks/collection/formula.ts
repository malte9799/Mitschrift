/**
 * Kleine Formelsprache für Formel-Felder – eigener Parser, kein `eval`.
 *
 *   {Punkte} / {Maximum} * 100
 *   wenn({Note} <= 4; "bestanden"; "nicht bestanden")
 *   tage(heute(); {Abgabe})
 *
 * Felder stehen in geschweiften Klammern, Argumente trennt `;` oder `,`, Dezimalzahlen mit Punkt.
 */

export type FormulaValue = number | string | boolean | null;

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'field'; name: string }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'unary'; op: '-' | '!'; arg: Node }
  | { t: 'bin'; op: string; l: Node; r: Node };

type Token = { k: 'num'; v: number } | { k: 'str'; v: string } | { k: 'field'; v: string } | { k: 'id'; v: string } | { k: 'op'; v: string };

const OPS = ['<=', '>=', '!=', '==', '&&', '||', '+', '-', '*', '/', '%', '^', '<', '>', '=', '!', '(', ')', ';', ','];

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === '{') {
      const end = src.indexOf('}', i);
      if (end < 0) throw new Error('„}“ fehlt');
      out.push({ k: 'field', v: src.slice(i + 1, end).trim() });
      i = end + 1;
    } else if (c === '"' || c === '„' || c === '“') {
      const end = src.slice(i + 1).search(/["“”]/);
      if (end < 0) throw new Error('Anführungszeichen fehlt');
      out.push({ k: 'str', v: src.slice(i + 1, i + 1 + end) });
      i += end + 2;
    } else if (/\d/.test(c)) {
      const m = /^\d+(\.\d+)?/.exec(src.slice(i))!;
      out.push({ k: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (/[\p{L}_]/u.test(c)) {
      const m = /^[\p{L}_][\p{L}\d_]*/u.exec(src.slice(i))!;
      out.push({ k: 'id', v: m[0].toLowerCase() });
      i += m[0].length;
    } else {
      const op = OPS.find((o) => src.startsWith(o, i));
      if (!op) throw new Error(`Unerwartetes Zeichen „${c}“`);
      out.push({ k: 'op', v: op });
      i += op.length;
    }
  }
  return out;
}

// Bindungsstärke der zweistelligen Operatoren; `und`/`oder` sind Wort-Varianten von && und ||.
const PREC: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '=': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '^': 7 };
const WORD_OPS: Record<string, string> = { und: '&&', and: '&&', oder: '||', or: '||' };

function parse(src: string): Node {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v: string) => peek()?.k === 'op' && peek().v === v;
  const binOp = () => {
    const t = peek();
    if (!t) return null;
    if (t.k === 'op' && t.v in PREC) return t.v;
    if (t.k === 'id' && t.v in WORD_OPS) return WORD_OPS[t.v];
    return null;
  };

  function expr(min: number): Node {
    let left = unary();
    for (let op = binOp(); op && PREC[op] >= min; op = binOp()) {
      p++;
      // ^ ist rechtsassoziativ, alles andere links.
      const right = expr(op === '^' ? PREC[op] : PREC[op] + 1);
      left = { t: 'bin', op: op === '=' ? '==' : op, l: left, r: right };
    }
    return left;
  }

  function unary(): Node {
    if (isOp('-') || isOp('!')) {
      const op = tokens[p++].v as '-' | '!';
      return { t: 'unary', op, arg: unary() };
    }
    return primary();
  }

  function primary(): Node {
    const t = tokens[p++];
    if (!t) throw new Error('Ausdruck unvollständig');
    if (t.k === 'num') return { t: 'num', v: t.v };
    if (t.k === 'str') return { t: 'str', v: t.v };
    if (t.k === 'field') return { t: 'field', name: t.v };
    if (t.k === 'id') {
      if (!isOp('(')) {
        if (t.v === 'wahr' || t.v === 'true') return { t: 'call', name: 'wahr', args: [] };
        if (t.v === 'falsch' || t.v === 'false') return { t: 'call', name: 'falsch', args: [] };
        throw new Error(`„${t.v}“ – Felder stehen in {Klammern}, Funktionen brauchen ( )`);
      }
      p++;
      const args: Node[] = [];
      if (!isOp(')')) {
        do args.push(expr(1));
        while ((isOp(';') || isOp(',')) && ++p);
      }
      if (!isOp(')')) throw new Error('„)“ fehlt');
      p++;
      return { t: 'call', name: t.v, args };
    }
    if (t.v === '(') {
      const inner = expr(1);
      if (!isOp(')')) throw new Error('„)“ fehlt');
      p++;
      return inner;
    }
    throw new Error(`Unerwartetes „${t.v}“`);
  }

  const tree = expr(1);
  if (p < tokens.length) throw new Error(`Unerwartetes „${tokens[p].v}“`);
  return tree;
}

const isDate = (v: FormulaValue): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dayNumber = (v: string) => Math.round(Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) / 86_400_000);
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const num = (v: FormulaValue): number => (typeof v === 'number' ? v : typeof v === 'boolean' ? +v : v === null || v === '' ? 0 : Number(String(v).replace(',', '.')));
const str = (v: FormulaValue): string => (v === null ? '' : typeof v === 'boolean' ? (v ? 'Ja' : 'Nein') : typeof v === 'number' ? formatNumber(v) : v);
const truthy = (v: FormulaValue) => v !== null && v !== false && v !== 0 && v !== '';

export function formatNumber(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/** Zahlen aus einer Argumentliste (leere Werte zählen nicht mit). */
const numbers = (args: FormulaValue[]) => args.filter((a) => a !== null && a !== '').map(num).filter((n) => Number.isFinite(n));

const FUNCTIONS: Record<string, (args: FormulaValue[]) => FormulaValue> = {
  wahr: () => true,
  falsch: () => false,
  runden: ([v, digits]) => {
    const f = 10 ** num(digits ?? 0);
    return Math.round(num(v) * f) / f;
  },
  abs: ([v]) => Math.abs(num(v)),
  wurzel: ([v]) => Math.sqrt(num(v)),
  min: (a) => (numbers(a).length ? Math.min(...numbers(a)) : null),
  max: (a) => (numbers(a).length ? Math.max(...numbers(a)) : null),
  summe: (a) => numbers(a).reduce((s, n) => s + n, 0),
  mittel: (a) => (numbers(a).length ? numbers(a).reduce((s, n) => s + n, 0) / numbers(a).length : null),
  länge: ([v]) => str(v).length,
  groß: ([v]) => str(v).toUpperCase(),
  klein: ([v]) => str(v).toLowerCase(),
  verketten: (a) => a.map(str).join(''),
  enthält: ([v, part]) => str(v).toLowerCase().includes(str(part).toLowerCase()),
  leer: ([v]) => v === null || v === '',
  nicht: ([v]) => !truthy(v),
  heute: () => isoDate(new Date()),
  tage: ([from, to]) => (isDate(from) && isDate(to) ? dayNumber(to) - dayNumber(from) : null),
  jahr: ([v]) => (isDate(v) ? +v.slice(0, 4) : null),
  monat: ([v]) => (isDate(v) ? +v.slice(5, 7) : null),
  tag: ([v]) => (isDate(v) ? +v.slice(8, 10) : null),
};

const ALIASES: Record<string, string> = {
  if: 'wenn', round: 'runden', sqrt: 'wurzel', sum: 'summe', avg: 'mittel', mittelwert: 'mittel', average: 'mittel', length: 'länge', laenge: 'länge',
  upper: 'groß', gross: 'groß', lower: 'klein', concat: 'verketten', contains: 'enthält', enthaelt: 'enthält', empty: 'leer', not: 'nicht',
  today: 'heute', days: 'tage', year: 'jahr', month: 'monat', day: 'tag',
};

/** Für die Hilfe im Formel-Editor. */
export const formulaHelp = ['wenn(a; dann; sonst)', 'runden(x; stellen)', 'summe(…) · mittel(…) · min(…) · max(…)', 'tage(von; bis) · heute()', 'verketten(…) · länge(text)', 'leer(x) · enthält(text; teil)'];

function evaluate(node: Node, field: (name: string) => FormulaValue): FormulaValue {
  switch (node.t) {
    case 'num':
    case 'str':
      return node.v;
    case 'field':
      return field(node.name);
    case 'unary': {
      const v = evaluate(node.arg, field);
      return node.op === '-' ? -num(v) : !truthy(v);
    }
    case 'call': {
      const name = ALIASES[node.name] ?? node.name;
      // wenn() wertet nur den gewählten Zweig aus.
      if (name === 'wenn') {
        if (node.args.length < 2) throw new Error('wenn(bedingung; dann; sonst)');
        return truthy(evaluate(node.args[0], field)) ? evaluate(node.args[1], field) : node.args[2] ? evaluate(node.args[2], field) : null;
      }
      const fn = FUNCTIONS[name];
      if (!fn) throw new Error(`Unbekannte Funktion „${node.name}“`);
      return fn(node.args.map((a) => evaluate(a, field)));
    }
    case 'bin': {
      if (node.op === '&&') return truthy(evaluate(node.l, field)) && truthy(evaluate(node.r, field));
      if (node.op === '||') return truthy(evaluate(node.l, field)) || truthy(evaluate(node.r, field));
      const l = evaluate(node.l, field);
      const r = evaluate(node.r, field);
      switch (node.op) {
        case '+':
          // Text + irgendwas hängt aneinander; Datum + Zahl verschiebt um Tage.
          if (isDate(l) && typeof r === 'number') return new Date((dayNumber(l) + r) * 86_400_000).toISOString().slice(0, 10);
          return typeof l === 'string' || typeof r === 'string' ? str(l) + str(r) : num(l) + num(r);
        case '-':
          if (isDate(l) && isDate(r)) return dayNumber(l) - dayNumber(r);
          if (isDate(l) && typeof r === 'number') return new Date((dayNumber(l) - r) * 86_400_000).toISOString().slice(0, 10);
          return num(l) - num(r);
        case '*':
          return num(l) * num(r);
        case '/':
          return num(r) === 0 ? null : num(l) / num(r);
        case '%':
          return num(r) === 0 ? null : num(l) % num(r);
        case '^':
          return num(l) ** num(r);
        case '==':
        case '!=': {
          const same = typeof l === 'number' || typeof r === 'number' ? num(l) === num(r) : str(l).toLowerCase() === str(r).toLowerCase();
          return node.op === '==' ? same : !same;
        }
        default: {
          // Vergleiche: Zahlen numerisch, sonst als Text (ISO-Daten sortieren damit richtig).
          const cmp = typeof l === 'number' || typeof r === 'number' ? num(l) - num(r) : str(l).localeCompare(str(r), 'de');
          return node.op === '<' ? cmp < 0 : node.op === '>' ? cmp > 0 : node.op === '<=' ? cmp <= 0 : cmp >= 0;
        }
      }
    }
  }
}

const cache = new Map<string, Node | Error>();

/** Fehlermeldung zur Formel, oder `null`, wenn sie sich lesen lässt. */
export function formulaError(src: string): string | null {
  if (!src.trim()) return null;
  const tree = compile(src);
  return tree instanceof Error ? tree.message : null;
}

function compile(src: string): Node | Error {
  let tree = cache.get(src);
  if (!tree) {
    try {
      tree = parse(src);
    } catch (e) {
      tree = e instanceof Error ? e : new Error(String(e));
    }
    cache.set(src, tree);
  }
  return tree;
}

/** Formel auswerten; `field` liefert den Wert eines Feldes nach Namen. Fehler ergeben `null`. */
export function runFormula(src: string, field: (name: string) => FormulaValue): FormulaValue {
  if (!src.trim()) return null;
  const tree = compile(src);
  if (tree instanceof Error) return null;
  try {
    const v = evaluate(tree, field);
    return typeof v === 'number' && !Number.isFinite(v) ? null : v;
  } catch {
    return null;
  }
}
