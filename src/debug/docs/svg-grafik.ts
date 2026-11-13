import type { DebugDoc } from '../debugDocs';

const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: object[]) => ({ type: 'paragraph', content });
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const svg = (source: string, attrs: Record<string, unknown> = {}) => ({ type: 'svg', attrs: { svg: source, ...attrs } });

const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Strich-Icon mit currentColor – implizites Schwarz, im Dunkelmodus invertiert. */
const clock = `<svg ${NS} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;

/** Farbige Formen + Text ohne fill (implizites Schwarz). */
const cell = `<svg ${NS} viewBox="0 0 300 160" width="300" height="160"><rect x="10" y="20" width="120" height="120" rx="14" fill="#f4a261" stroke="#264653" stroke-width="4"/><circle cx="215" cy="80" r="60" fill="#2a9d8f" stroke="#264653" stroke-width="4"/><path d="M40 120 L100 40" stroke="#e76f51" stroke-width="6"/><text x="160" y="150" font-size="18">Zelle</text></svg>`;

/** Farben in <style> und style-Attributen – die Palette muss sie trotzdem finden. */
const styled = `<svg ${NS} viewBox="0 0 200 120" width="200" height="120"><style>.a{fill:#5b5bd6;stroke:#1c1c1e;stroke-width:3}.b{fill:rgb(217,58,43)}</style><rect class="a" x="10" y="10" width="80" height="100" rx="10"/><circle class="b" cx="140" cy="45" r="30"/><path d="M110 100 h80" style="stroke:#1f8a4c;stroke-width:6;stroke-linecap:round"/></svg>`;

/** Pfeil nach rechts – zum Testen von Drehen/Spiegeln. */
const arrow = `<svg ${NS} viewBox="0 0 120 60" width="120" height="60"><path d="M8 30h86" stroke="#1f6fd1" stroke-width="8" stroke-linecap="round"/><path d="M78 10l26 20-26 20z" fill="#1f6fd1"/><circle cx="14" cy="30" r="10" fill="#b8650a"/></svg>`;

/** Reine Strichzeichnung in Schwarz – typischer Kandidat für „Im Dunkelmodus invertieren“. */
const sketch = `<svg ${NS} viewBox="0 0 220 120" width="220" height="120" fill="none" stroke="#111" stroke-width="2.5" stroke-linejoin="round"><path d="M20 100 60 30 100 100z"/><rect x="120" y="40" width="70" height="60"/><path d="M120 40l35-25 35 25"/><text x="30" y="116" font-size="11" fill="#111" stroke="none">Dreieck</text><text x="135" y="116" font-size="11" fill="#111" stroke="none">Haus</text></svg>`;

/** Absichtlich „böse“: Skript, Event-Handler, externer Link – als Code zum Einfügen-Testen. */
const hostile = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Einfügen testen: Skript, onload und externe Verweise müssen verschwinden -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="60mm" height="30mm" viewBox="0 0 120 60" onload="alert('onload')" inkscape:version="1.3">
  <script>alert('script')</script>
  <style>@import url(https://example.com/x.css); .x{fill:url(https://example.com/p.png)}</style>
  <a href="javascript:alert('link')"><rect x="5" y="5" width="50" height="50" rx="8" fill="#8250df"/></a>
  <image href="https://example.com/tracker.png" x="60" y="5" width="50" height="50"/>
  <circle cx="90" cy="30" r="20" fill="#1f8a4c" onclick="alert('click')"/>
</svg>`;

const filler = [
  'Die Zelle ist die kleinste Einheit des Lebens. Sie besitzt eine Membran, Zellplasma und bei Eukaryoten einen Zellkern.',
  'Mitochondrien liefern Energie in Form von ATP, Ribosomen bauen Proteine auf. Pflanzenzellen haben zusätzlich eine Zellwand, Chloroplasten und eine große Vakuole.',
  'Beim Mikroskopieren sieht man diese Bestandteile unterschiedlich gut – Färbungen helfen, Strukturen sichtbar zu machen.',
];

const doc: DebugDoc = {
  key: 'svg-grafik',
  title: 'Debug: SVG-Grafik',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs: { variant: 'note' },
        content: [
          p(
            t('Testfälle für den SVG-Block. Werkzeugleiste erscheint beim Überfahren; '),
            t('Stil', ['bold']),
            t(' öffnet Farben/Linien/Hintergrund, '),
            t('Doppelklick', ['bold']),
            t(' wandelt den Block in ein Whiteboard um (SVG als Bild in Excalidraw). Griffe links/rechts ändern die Breite.'),
          ),
        ],
      },

      h('Icon mit currentColor (natürliche Größe, Dunkelmodus: invertieren)'),
      svg(clock, { dark: 'invert' }),

      h('Farbiges SVG, unverändert'),
      p(t('Palette im Stil-Menü: 5 Farben inkl. implizitem Schwarz vom Text „Zelle“.')),
      svg(cell),

      h('Gleiches SVG mit Stil'),
      p(t('Farbe ersetzt (Kreis lila), Strichstärke 2×, kariert, 16 px Abstand, Beschriftung.')),
      svg(cell, { colors: { '#2a9d8f': '#8250df' }, strokeScale: 2, background: 'grid', padding: 16, caption: 'Tierzelle (vereinfacht)', width: 70 }),

      h('Alles eingefärbt + Rahmen + Karte'),
      svg(cell, {
        colors: { '#f4a261': '#5b5bd6', '#2a9d8f': '#5b5bd6', '#264653': '#5b5bd6', '#e76f51': '#5b5bd6', '#000000': '#5b5bd6' },
        background: 'card',
        padding: 20,
        border: true,
        width: 50,
        align: 'left',
      }),

      h('Farben aus <style> und style-Attributen'),
      svg(styled, { align: 'right', width: 40 }),

      h('Drehen & Spiegeln'),
      p(t('Original, 90° gedreht, horizontal gespiegelt, 180° + vertikal gespiegelt, 50 % Deckkraft.')),
      svg(arrow, { width: 30, align: 'left' }),
      svg(arrow, { width: 15, align: 'left', rotate: 90 }),
      svg(arrow, { width: 30, align: 'left', flipH: true }),
      svg(arrow, { width: 30, align: 'left', rotate: 180, flipV: true, opacity: 0.5 }),

      h('Text umfließt – rechts'),
      svg(cell, { align: 'floatRight', width: 42, background: 'dots', padding: 12, caption: 'Rechts, 42 %' }),
      ...filler.map((s) => p(t(s))),

      h('Text umfließt – links'),
      svg(sketch, { align: 'floatLeft', width: 38, dark: 'invert' }),
      ...filler.map((s) => p(t(s))),

      h('Strichzeichnung: Dunkelmodus unverändert vs. invertiert'),
      p(t('Im hellen Theme sehen beide gleich aus; im dunklen ist nur die zweite lesbar.')),
      svg(sketch, { width: 45, align: 'left', dark: 'keep', caption: 'dark: keep' }),
      svg(sketch, { width: 45, align: 'left', dark: 'invert', caption: 'dark: invert' }),

      h('Fester Hintergrund + Invertieren'),
      p(t('Weißer Hintergrund: Im Dunkelmodus wird der ganze Rahmen invertiert, nicht nur das Bild.')),
      svg(sketch, { width: 45, background: '#ffffff', padding: 16, dark: 'invert' }),

      h('Leerer Block'),
      p(t('Code einfügen, Datei wählen oder „Leer zeichnen“ (öffnet den Editor mit leerem Blatt).')),
      svg(''),

      h('Einfügen & Bereinigen testen'),
      p(
        t('Den Code unten kopieren und in eine leere Zeile einfügen (⌘V). Erwartet: '),
        t('<script>', ['code']),
        t(', '),
        t('onload', ['code']),
        t('/'),
        t('onclick', ['code']),
        t(', '),
        t('javascript:', ['code']),
        t('-Link, externes Bild und '),
        t('@import', ['code']),
        t(' sind weg, Inkscape-Attribute entfernt, 60mm×30mm → Pixelmaße.'),
      ),
      { type: 'codeBlock', attrs: { language: 'xml' }, content: [t(hostile)] },
      p(t('')),
    ],
  },
};

export default doc;
