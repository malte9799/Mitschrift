/**
 * Inhalt der Showcase-Notiz: Beispiele für Formeln, Fußnoten, Taste und Tief-/Hochgestellt
 * zum direkten Ausprobieren (Tippen, Klicken, Einfügen, Export). Wird einmalig als Notiz
 * angelegt, siehe `ShowcasePage.tsx`.
 */
export const SHOWCASE_TITLE = 'Showcase: Formeln, Fußnoten & Co.';

export const showcaseDoc = {
  type: 'doc',
  content: [
    {
      type: 'callout',
      attrs: { variant: 'note' },
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Diese Notiz ist zum Ausprobieren da. Tippe direkt in den Text, klicke auf Formeln/Fußnoten zum Bearbeiten, oder exportiere die Notiz oben rechts (Markdown, HTML, PDF, Text, RTF).',
            },
          ],
        },
      ],
    },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Formeln' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Inline-Formeln entstehen beim Tippen von ' },
        { type: 'text', text: '$…$', marks: [{ type: 'code' }] },
        { type: 'text', text: ', z. B. die Energie-Masse-Äquivalenz ' },
        { type: 'mathInline', attrs: { latex: 'E = mc^2' } },
        { type: 'text', text: ' oder die Kreisfläche ' },
        { type: 'mathInline', attrs: { latex: 'A = \\pi r^2' } },
        { type: 'text', text: '. ⌘⇧M macht markierten Text zur Formel. Klick auf eine Formel öffnet die Bearbeitung.' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Ein Formel-Block entsteht mit $$ plus Leerzeichen oder Enter:' }],
    },
    { type: 'mathBlock', attrs: { latex: '\\int_0^1 x^2 \\, dx = \\frac{1}{3}' } },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Weitere Beispiele: die quadratische Lösungsformel' },
      ],
    },
    { type: 'mathBlock', attrs: { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' } },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Fußnoten' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Im Text steht nur die Nummer' },
        { type: 'footnote', attrs: { text: 'So sieht eine Fußnote aus – Quelle, Zitat oder Anmerkung.' } },
        { type: 'text', text: ', automatisch durchnummeriert. Ein Klick öffnet die Bearbeitung' },
        { type: 'footnote', attrs: { text: 'Zweite Fußnote als Beispiel für die fortlaufende Nummerierung.' } },
        { type: 'text', text: '. Unter der Notiz steht die gesammelte Liste aller Fußnoten.' },
      ],
    },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Taste, Tiefgestellt, Hochgestellt' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Tasten mit ⌘⇧K: Speichern geht mit ' },
        { type: 'text', text: 'Cmd', marks: [{ type: 'kbd' }] },
        { type: 'text', text: ' + ' },
        { type: 'text', text: 'S', marks: [{ type: 'kbd' }] },
        { type: 'text', text: ', Kopieren mit ' },
        { type: 'text', text: 'Ctrl', marks: [{ type: 'kbd' }] },
        { type: 'text', text: ' + ' },
        { type: 'text', text: 'C', marks: [{ type: 'kbd' }] },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Tiefgestellt und hochgestellt über die Formatleiste bei markiertem Text: Wasser ist H' },
        { type: 'text', text: '2', marks: [{ type: 'subscript' }] },
        { type: 'text', text: 'O, und x hoch zwei ist x' },
        { type: 'text', text: '2', marks: [{ type: 'superscript' }] },
        { type: 'text', text: '.' },
      ],
    },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Markdown einfügen' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Kopiere Markdown wie ' },
        { type: 'text', text: '$a^2+b^2=c^2$', marks: [{ type: 'code' }] },
        { type: 'text', text: ', ' },
        { type: 'text', text: '[^1]', marks: [{ type: 'code' }] },
        { type: 'text', text: ' mit ' },
        { type: 'text', text: '[^1]: Quelle', marks: [{ type: 'code' }] },
        { type: 'text', text: ' sowie ' },
        { type: 'text', text: '<sub>', marks: [{ type: 'code' }] },
        { type: 'text', text: ', ' },
        { type: 'text', text: '<sup>', marks: [{ type: 'code' }] },
        { type: 'text', text: ' und ' },
        { type: 'text', text: '<kbd>', marks: [{ type: 'code' }] },
        { type: 'text', text: ' aus einer anderen App hierher und füge es ein – daraus werden automatisch die passenden Elemente.' },
      ],
    },
  ],
};
