/**
 * Zentrale Prüfung für Links aus Notizen. Nur ungefährliche Ziele kommen durch;
 * alles andere (javascript:, data:, vbscript:, unbekannte Schemata …) wird verworfen.
 */

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * Gibt die bereinigte URL zurück oder `null`, wenn sie nicht erlaubt ist.
 * Steuerzeichen und Whitespace werden vorher entfernt (Browser ignorieren sie im Schema:
 * `java\nscript:` würde sonst als `javascript:` ausgeführt).
 * Erlaubt: http(s), mailto, tel sowie relative Pfade (`/…`, `#…`, `./…`, `../…`).
 * Notizlinks sind relative Pfade (`/n/<id>`) und damit abgedeckt.
 */
export function sanitizeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = url.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  if (!clean) return null;
  if (/^(\/(?!\/)|#|\.\.?\/)/.test(clean)) return clean;
  const m = clean.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!m) return null;
  return ALLOWED_SCHEMES.has(m[1].toLowerCase()) ? clean : null;
}

/**
 * Für die Link-Eingabe: „example.com“ oder „localhost:3000“ wird zu https://…,
 * erlaubte Schemata und Pfade bleiben, alles Gefährliche ergibt `null`.
 */
export function normalizeHrefInput(input: string): string | null {
  const href = input.trim();
  if (!href) return null;
  // „host:port“ (z. B. localhost:3000) ist kein Schema.
  if (/^[^\s/:@]+:\d+(?:[/?#]|$)/.test(href)) return sanitizeHref(`https://${href}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || /^(\/(?!\/)|#|\.\.?\/)/.test(href)) return sanitizeHref(href);
  return sanitizeHref(`https://${href}`);
}
