export interface TimelineEntry {
  /** Wie eingegeben: „1492“, „14.07.1789“, „44 v. Chr.“, „März 2024“ … */
  date: string;
  /** Optionales Ende – macht aus dem Ereignis einen Zeitraum. */
  end?: string;
  title: string;
  text: string;
  /** Index in die Farbpalette (--plot-N). */
  color: number;
}

export type TimelineLayout = 'axis' | 'list';

const MONTHS: Record<string, number> = {
  jan: 1, januar: 1, jänner: 1, feb: 2, februar: 2, mär: 3, mrz: 3, märz: 3, maerz: 3, apr: 4, april: 4, mai: 5, jun: 6, juni: 6,
  jul: 7, juli: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dez: 12, dezember: 12,
  march: 3, may: 5, june: 6, july: 7, oct: 10, october: 10, dec: 12, december: 12, january: 1, february: 2,
};

const monthShort = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** Jahr (+ Monat/Tag) → Kommazahl, z. B. 1789-07-14 → 1789.53. */
function frac(y: number, m = 1, d = 1): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = d - 1;
  for (let i = 0; i < m - 1; i++) doy += days[i];
  return y + doy / 365;
}

/**
 * Liest ein Datum als Kommazahl-Jahr. Versteht Jahre (auch v. Chr./BC), ISO (2024-03-01, 2024-03),
 * deutsche Schreibweise (14.07.1789, 07.1789, 14. Juli 1789, Juli 1789), Jahrhunderte (15. Jh.) und „heute“.
 */
export function parseDate(input: string): number | null {
  let s = input.trim().toLowerCase().replace(/^(ca\.?|um|circa|etwa|ab|seit)\s+/, '');
  if (!s) return null;
  if (s === 'heute' || s === 'jetzt' || s === 'today') {
    const n = new Date();
    return frac(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }
  let sign = 1;
  const bc = /\s*(v\.?\s*chr\.?|v\.?\s*u\.?\s*z\.?|bc|bce)$/;
  if (bc.test(s)) {
    sign = -1;
    s = s.replace(bc, '').trim();
  }
  s = s.replace(/\s*(n\.?\s*chr\.?|ad|ce)$/, '').trim();

  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,2})\.\s*(jh|jhd|jhdt|jahrhundert)\.?$/.exec(s))) return sign > 0 ? (Number(m[1]) - 1) * 100 : -Number(m[1]) * 100;
  if ((m = /^(-?\d{1,6})$/.exec(s))) return sign * Number(m[1]);
  if ((m = /^(-?\d{1,6})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s))) return sign * frac(Number(m[1]), Number(m[2]), Number(m[3] ?? 1));
  if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/.exec(s))) return sign * frac(Number(m[3]), Number(m[2]), Number(m[1]));
  if ((m = /^(\d{1,2})[./](\d{1,6})$/.exec(s))) return sign * frac(Number(m[2]), Number(m[1]));
  if ((m = /^(?:(\d{1,2})\.?\s+)?([a-zäöü]+)\.?\s+(\d{1,6})$/.exec(s))) {
    const month = MONTHS[m[2]] ?? MONTHS[m[2].slice(0, 3)];
    if (month) return sign * frac(Number(m[3]), month, Number(m[1] ?? 1));
  }
  return null;
}

export interface ParsedEntry extends TimelineEntry {
  /** Index im gespeicherten Array (fürs Bearbeiten). */
  index: number;
  start: number;
  /** Ende als Zahl, falls es ein Zeitraum ist. */
  stop: number | null;
}

/** Gültige Einträge, chronologisch sortiert. */
export function parseEntries(entries: TimelineEntry[]): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  entries.forEach((e, index) => {
    // „1918–1933“ bzw. „1918 - 1933“ im Datumsfeld zählt als Zeitraum.
    const range = e.end?.trim() ? null : /^(.+?)\s*(?:–|—|\s-\s|(?<=^\d{3,4})-(?=\d{3,4}$)|\bbis\b)\s*(.+)$/.exec(e.date.trim());
    const start = parseDate(range ? range[1] : e.date);
    if (start === null) return;
    const endText = range ? range[2] : e.end;
    const endVal = endText?.trim() ? parseDate(endText) : null;
    const stop = endVal !== null && endVal > start ? endVal : null;
    out.push({ ...e, index, start, stop });
  });
  return out.sort((a, b) => a.start - b.start || (a.stop ?? a.start) - (b.stop ?? b.start));
}

export function dateRange(e: TimelineEntry): string {
  return e.end?.trim() ? `${e.date.trim()} – ${e.end.trim()}` : e.date.trim();
}

/** Beschriftung eines Achsen-Strichs; bei kurzen Zeiträumen mit Monat. */
export function tickLabel(t: number, step: number): string {
  const y = Math.floor(t + 1e-9);
  const yearText = y < 0 ? `${-y} v. Chr.` : String(y);
  if (step >= 1) return yearText;
  const month = Math.round((t - y) * 12);
  return month === 0 ? yearText : `${monthShort[month] ?? ''} ${y}`;
}

/** Schrittweite für Jahres-Striche; unter einem Jahr in Monaten (1/12, 3/12, 6/12). */
export function yearStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  if (raw < 1) return raw < 1 / 12 ? 1 / 12 : raw < 3 / 12 ? 3 / 12 : 6 / 12;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

export const sampleEntries: TimelineEntry[] = [
  { date: '1918', end: '1933', title: 'Weimarer Republik', text: 'Erste parlamentarische Demokratie in Deutschland.', color: 0 },
  { date: '09.11.1918', title: 'Ausrufung der Republik', text: 'Philipp Scheidemann ruft vom Reichstag die Republik aus.', color: 0 },
  { date: '1923', title: 'Hyperinflation', text: 'Ein US-Dollar kostet im November 4,2 Billionen Mark.', color: 1 },
  { date: '1929', title: 'Weltwirtschaftskrise', text: 'Börsencrash in New York; Massenarbeitslosigkeit folgt.', color: 3 },
  { date: '1933', end: '1945', title: 'NS-Diktatur', text: 'Machtübernahme am 30. Januar 1933.', color: 1 },
  { date: '1939', end: '1945', title: 'Zweiter Weltkrieg', text: 'Beginn mit dem Überfall auf Polen am 1. September 1939.', color: 5 },
  { date: '23.05.1949', title: 'Grundgesetz', text: 'Gründung der Bundesrepublik Deutschland.', color: 2 },
];
