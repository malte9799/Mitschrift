/**
 * Kleiner, sicherer Formel-Parser für den Funktionsplotter (kein eval).
 * Versteht Schulschreibweise: `2x^2 - 3x + 1`, `a·sin(bx)`, `|x|`, `f(x) = …`, `√x`.
 * Einbuchstabige Namen außer x, e sind Parameter und bekommen Schieberegler.
 */

export type Scope = Record<string, number>;
type Ev = (s: Scope) => number;

export type Compiled = { ok: true; run: Ev; params: string[] } | { ok: false; error: string };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  cot: (x) => 1 / Math.tan(x),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  root: (x, n = 2) => (x < 0 && n % 2 === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)),
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)),
  lg: Math.log10,
  ld: Math.log2,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  sgn: Math.sign,
  min: Math.min,
  max: Math.max,
  mod: (a, b) => ((a % b) + b) % b,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, π: Math.PI, tau: Math.PI * 2 };

/** Namen, die beim Zerlegen zusammengeschriebener Buchstaben („xsin“) erkannt werden – längste zuerst. */
const KNOWN = [...Object.keys(FUNCS), ...Object.keys(CONSTS)].sort((a, b) => b.length - a.length);

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (num) {
      out.push({ t: 'num', v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[a-zA-Zπ](?:_\w+)?[a-zA-Z]*/.exec(src.slice(i));
    if (id) {
      for (const part of splitIdent(id[0])) out.push({ t: 'id', v: part });
      i += id[0].length;
      continue;
    }
    const map: Record<string, string> = { '·': '*', '×': '*', '÷': '/', '−': '-', '²': '^2', '³': '^3', '√': 'sqrt' };
    if (map[c]) {
      if (c === '√') out.push({ t: 'id', v: 'sqrt' });
      else if (c === '²' || c === '³') out.push({ t: 'op', v: '^' }, { t: 'num', v: c === '²' ? 2 : 3 });
      else out.push({ t: 'op', v: map[c] });
      i++;
      continue;
    }
    if ('+-*/^(),|'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`Unbekanntes Zeichen „${c}“`);
  }
  return out;
}

/** „axsin“ → a, x, sin. Bekannte Namen gewinnen, sonst Einzelbuchstaben (mit Index wie a_1). */
function splitIdent(s: string): string[] {
  if (FUNCS[s] || s in CONSTS || /^[a-zA-Z]_\w+$/.test(s)) return [s];
  const parts: string[] = [];
  let i = 0;
  while (i < s.length) {
    const lower = s.slice(i).toLowerCase();
    const hit = KNOWN.find((k) => k.length > 1 && lower.startsWith(k));
    if (hit) {
      parts.push(hit);
      i += hit.length;
    } else if (s[i + 1] === '_') {
      const m = /^[a-zA-Z]_\w+/.exec(s.slice(i))!;
      parts.push(m[0]);
      i += m[0].length;
    } else {
      parts.push(s[i]);
      i++;
    }
  }
  return parts;
}

/** Entfernt „f(x) =“ bzw. „y =“ vor dem Term. */
export function stripLhs(src: string): string {
  return src.replace(/^\s*(?:[a-zA-Z]\w*\s*\(\s*x\s*\)|y)\s*=\s*/, '');
}

export function compile(source: string): Compiled {
  const src = stripLhs(source);
  if (!src.trim()) return { ok: false, error: 'Leer' };
  let toks: Tok[];
  try {
    toks = tokenize(src);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  let p = 0;
  const params = new Set<string>();
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`„${v}“ erwartet`);
    p++;
  };

  function expr(): Ev {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v;
      const a = left;
      const b = term();
      left = op === '+' ? (s) => a(s) + b(s) : (s) => a(s) - b(s);
    }
    return left;
  }

  /** Beginnt hier ein Operand, der ohne „*“ angehängt werden darf (2x, 3(x+1), x sin x)? */
  const startsImplicit = () => {
    const t = peek();
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  };

  function term(): Ev {
    let left = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[p++].v;
        const a = left;
        const b = unary();
        left = op === '*' ? (s) => a(s) * b(s) : (s) => a(s) / b(s);
      } else if (startsImplicit()) {
        const a = left;
        const b = power();
        left = (s) => a(s) * b(s);
      } else return left;
    }
  }

  function unary(): Ev {
    if (isOp('-')) {
      p++;
      const a = unary();
      return (s) => -a(s);
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    return power();
  }

  function power(): Ev {
    const base = primary();
    if (isOp('^')) {
      p++;
      const ex = unary();
      return (s) => Math.pow(base(s), ex(s));
    }
    return base;
  }

  function primary(): Ev {
    const t = toks[p++];
    if (!t) throw new Error('Ausdruck endet zu früh');
    if (t.t === 'num') return () => t.v;
    if (t.t === 'op' && t.v === '(') {
      const e = expr();
      expect(')');
      return e;
    }
    if (t.t === 'op' && t.v === '|') {
      const e = expr();
      expect('|');
      return (s) => Math.abs(e(s));
    }
    if (t.t === 'id') {
      const name = t.v;
      const fn = FUNCS[name.toLowerCase()];
      if (fn) {
        if (isOp('(')) {
          p++;
          const args = [expr()];
          while (isOp(',')) {
            p++;
            args.push(expr());
          }
          expect(')');
          if (isOp('^')) {
            // sin(x)^2 wie in der Schule: (sin x)²
            p++;
            const ex = unary();
            return (s) => Math.pow(fn(...args.map((a) => a(s))), ex(s));
          }
          return (s) => fn(...args.map((a) => a(s)));
        }
        // sin x, sin 2x: Argument ohne Klammern – ein Produkt ohne Operatoren, endet vor der nächsten Funktion.
        let arg = power();
        while (peek()?.t === 'num' || (peek()?.t === 'id' && !FUNCS[String(peek().v).toLowerCase()])) {
          const a = arg;
          const b = power();
          arg = (s) => a(s) * b(s);
        }
        const whole = arg;
        return (s) => fn(whole(s));
      }
      if (name in CONSTS && name !== 'e') return () => CONSTS[name];
      if (name === 'e') return () => Math.E;
      if (name === 'x') return (s) => s.x;
      if (/^[a-zA-Z](_\w+)?$/.test(name)) {
        params.add(name);
        return (s) => s[name] ?? 0;
      }
      throw new Error(`Unbekannt: „${name}“`);
    }
    throw new Error(`Unerwartet: „${t.v}“`);
  }

  try {
    const run = expr();
    if (p < toks.length) throw new Error(`Unerwartet: „${toks[p].v}“`);
    return { ok: true, run, params: [...params].sort() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Zahl kurz und deutsch formatiert: 1,5 · −0,333 · 12 400. */
export function fmt(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 1e-4) return n.toExponential(2).replace('.', ',').replace('e', '·10^');
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits }).replace('-', '−');
}
