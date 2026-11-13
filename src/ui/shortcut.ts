/**
 * Tastenkürzel werden im Code in Mac-Schreibweise notiert (⌘ ⌥ ⌃ ⇧). Auf anderen Systemen gilt:
 * ⌘ → Strg, ⌥ → Alt, ⇧ → Umschalt – und ⌃⌘ (Steuerung+Befehl) → Strg+Alt, damit z. B. ⌃⌘B
 * nicht zu Strg+B wird und dem Editor „Fett“ wegnimmt.
 */
type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } };

export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test((navigator as NavigatorWithUAData).userAgentData?.platform || navigator.platform || navigator.userAgent);

const MOD = /[⌃⌥⇧⌘]/g;

function mods(glyphs: string) {
  const cmd = glyphs.includes('⌘');
  const ctrl = glyphs.includes('⌃');
  return { ctrl: cmd || ctrl, alt: glyphs.includes('⌥') || (cmd && ctrl), shift: glyphs.includes('⇧') };
}

function formatGroup(glyphs: string, key: string) {
  const m = mods(glyphs);
  return [m.ctrl && 'Strg', m.alt && 'Alt', m.shift && 'Umschalt', key].filter(Boolean).join('+');
}

/** Kürzel bzw. Text mit Kürzeln für die Anzeige: auf dem Mac unverändert, sonst „Strg+Alt+E“. */
export function formatShortcut(text: string): string {
  if (isMac) return text;
  return text.replace(/([⌃⌥⇧⌘]+)([A-Z0-9↵+−,])?/g, (_, glyphs: string, key = '') => formatGroup(glyphs, key));
}

/** Prüft ein Kürzel wie „⌃⌘S“ gegen ein Tastatur-Event (per `code`, da ⌥ die Taste verändert). */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  // AltGr (Strg+Alt unter Windows) tippt Zeichen wie € oder @ – nie als Kürzel werten.
  if (!isMac && e.getModifierState?.('AltGraph')) return false;
  const key = shortcut.replace(MOD, '');
  const want = isMac
    ? { ctrl: shortcut.includes('⌃'), alt: shortcut.includes('⌥'), shift: shortcut.includes('⇧'), meta: shortcut.includes('⌘') }
    : { ...mods(shortcut), meta: false };
  if (e.ctrlKey !== want.ctrl || e.altKey !== want.alt || e.shiftKey !== want.shift || e.metaKey !== want.meta) return false;
  const code = /^\d$/.test(key) ? `Digit${key}` : /^[A-Z]$/.test(key) ? `Key${key}` : '';
  return code ? e.code === code : e.key === key;
}
