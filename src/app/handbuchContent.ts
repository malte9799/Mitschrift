/**
 * Inhalt der Handbuch-Notiz: erklärt jeden Block mit einem echten, direkt nutzbaren Beispiel.
 * Wird einmalig angelegt und über `/handbuch` immer wieder geöffnet, siehe `HandbuchPage.tsx`.
 * Neue Blocktypen hier ergänzen (Quelle der Wahrheit: `src/editor/blockTypes.ts`).
 */
export const HANDBUCH_TITLE = 'Handbuch 📖';

const p = (...content: object[]) => ({ type: 'paragraph', content });
const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
const h1 = (text: string) => ({ type: 'heading', attrs: { level: 1 }, content: [t(text)] });
const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const li = (...content: object[]) => ({ type: 'listItem', content: [p(...content)] });
const note = (...content: object[]) => ({ type: 'callout', attrs: { variant: 'note' }, content: [p(...content)] });
const tip = (...content: object[]) => ({ type: 'callout', attrs: { variant: 'tip' }, content: [p(...content)] });

export const handbuchDoc = {
  type: 'doc',
  content: [
    note(
      t('Diese Notiz erklärt jeden Block von Mitschrift – mit einem echten Beispiel direkt darunter, zum Ausprobieren und Abschauen. Tippe „'),
      t('/', ['code']),
      t('“ in einer leeren Zeile, um selbst einen Block einzufügen, oder markiere Text für die Formatleiste.'),
    ),
    p(
      t('Zwei Modi oben in der Kopfleiste: '),
      t('Bearbeiten', ['bold']),
      t(' zum Schreiben, '),
      t('Lernen', ['bold']),
      t(' zum Üben – dort werden Lücken zu Eingabefeldern, Karteikarten drehbar, Quiz auswertbar und Toggles starten zugeklappt.'),
    ),

    // ================= Textstile =================
    h1('Textstile'),
    p(t('Überschriften mit „#“, „##“ oder „###“ am Zeilenanfang, oder über die Formatleiste bzw. „/“.')),
    { type: 'heading', attrs: { level: 1 }, content: [t('Überschrift 1')] },
    { type: 'heading', attrs: { level: 2 }, content: [t('Überschrift 2')] },
    { type: 'heading', attrs: { level: 3 }, content: [t('Überschrift 3')] },
    { type: 'paragraph', attrs: { variant: 'strong' }, content: [t('Fett als eigener Block – größer als normaler Fettdruck, für kurze Merksätze.')] },
    { type: 'paragraph', attrs: { variant: 'caption' }, content: [t('Beschriftung – klein und gedämpft, z. B. unter einem Bild.')] },
    p(
      t('Inline-Formatierung über die Formatleiste bei markiertem Text oder Tastenkürzel: '),
      t('fett', ['bold']),
      t(', '),
      t('kursiv', ['italic']),
      t(', '),
      t('durchgestrichen', ['strike']),
      t(', '),
      t('Code', ['code']),
      t(', '),
      t('Taste', ['kbd']),
      t(' (⌘⇧K), H'),
      t('2', ['subscript']),
      t('O tiefgestellt, x'),
      t('2', ['superscript']),
      t(' hochgestellt.'),
    ),

    // ================= Listen =================
    h1('Listen'),
    p(t('Aufzählung mit „-“ oder „*“ + Leerzeichen, nummeriert mit „1.“ + Leerzeichen, Aufgaben mit „x“ + Leerzeichen.')),
    { type: 'bulletList', content: [li(t('Erster Punkt')), li(t('Zweiter Punkt'))] },
    { type: 'orderedList', attrs: { start: 1 }, content: [li(t('Erster Schritt')), li(t('Zweiter Schritt'))] },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [p(t('Erledigte Aufgabe'))] },
        { type: 'taskItem', attrs: { checked: false, dueDate: null, dueTime: '', eventId: null }, content: [p(t('Offene Aufgabe – mit Datum entsteht automatisch ein Kalendertermin'))] },
      ],
    },
    tip(t('Setze bei einer Aufgabe ein Fälligkeitsdatum (Kalender-Symbol beim Antippen der Zeile) – der Termin taucht dann im '), t('Kalender', ['bold']), t(' auf und wird beim Abhaken erledigt markiert.')),
    h2('Toggle-Liste'),
    p(t('Zugeklappte Zeile mit Titel und verborgenem Inhalt – ideal zum Selbst-Abfragen. Im Lernmodus startet sie immer zu.')),
    { type: 'toggleBlock', attrs: { summary: 'Was ist die Hauptstadt von Australien?', open: true }, content: [p(t('Canberra – nicht Sydney.'))] },

    // ================= Hervorheben =================
    h1('Hervorheben'),
    { type: 'blockquote', content: [p(t('Ein Zitat – für Aussagen, Quelltexte oder Merksätze im Fließtext.'))] },
    p(t('Callouts im GitHub-Stil, wahlweise als Strich oder Fläche (Stil-Menü am Block):')),
    { type: 'callout', attrs: { variant: 'note' }, content: [p(t('Hinweis – neutrale Zusatzinfo.'))] },
    { type: 'callout', attrs: { variant: 'tip' }, content: [p(t('Tipp – ein nützlicher Kniff.'))] },
    { type: 'callout', attrs: { variant: 'important' }, content: [p(t('Wichtig – das sollte man sich merken.'))] },
    { type: 'callout', attrs: { variant: 'warning' }, content: [p(t('Warnung – hier ist Vorsicht geboten.'))] },
    { type: 'callout', attrs: { variant: 'caution' }, content: [p(t('Vorsicht – ein häufiger Fehler oder ein Risiko.'))] },

    // ================= Interaktiv (Lernmodus) =================
    h1('Interaktiv – für den Lernmodus'),
    h2('Lückentext'),
    p(t('Text markieren und in der Formatleiste auf das Lücken-Symbol klicken (oder ⌘⇧L). Im Lernmodus wird die Lücke zum Eingabefeld.')),
    p(t('Die Mitochondrien sind das '), t('Kraftwerk', ['cloze']), t(' der Zelle. Die Fotosynthese findet in den '), t('Chloroplasten', ['cloze']), t(' statt.')),
    h2('Karteikarten'),
    p(t('Stapel zum Umdrehen, im Lernmodus als „gewusst“ / „nochmal“ sortierbar.')),
    {
      type: 'flashcards',
      attrs: {
        cards: [
          { front: 'Photosynthese', back: 'Umwandlung von Lichtenergie in chemische Energie (Glucose).' },
          { front: 'Osmose', back: 'Diffusion von Wasser durch eine semipermeable Membran.' },
        ],
      },
    },
    h2('Quiz'),
    p(t('Multiple-Choice-Fragen mit Auswertung und Erklärung.')),
    {
      type: 'quiz',
      attrs: {
        questions: [
          {
            question: 'Welches Organell enthält die DNA einer Eukaryotenzelle?',
            options: ['Ribosom', 'Zellkern', 'Golgi-Apparat'],
            correct: 1,
            why: 'Die DNA liegt im Zellkern (plus etwas in Mitochondrien/Chloroplasten).',
          },
        ],
      },
    },
    h2('Ablauf, Zeitstrahl (Diagramm), Balken, Kreislauf'),
    p(t('Vier animierte Darstellungen für dieselbe Art von Daten – Einträge mit Titel und Text, bei Balken zusätzlich ein Zahlenwert.')),
    {
      type: 'diagram',
      attrs: {
        kind: 'steps',
        title: 'Wissenschaftliche Methode',
        items: [
          { label: 'Beobachten', text: 'Ein Phänomen fällt auf und wird beschrieben.' },
          { label: 'Hypothese', text: 'Eine überprüfbare Vermutung wird formuliert.' },
          { label: 'Experiment', text: 'Die Hypothese wird unter kontrollierten Bedingungen getestet.' },
        ],
      },
    },
    {
      type: 'diagram',
      attrs: {
        kind: 'bars',
        title: 'Zusammensetzung der Luft',
        items: [
          { label: 'Stickstoff', text: '78 %', value: 78 },
          { label: 'Sauerstoff', text: '21 %', value: 21 },
          { label: 'Sonstige', text: '1 %', value: 1 },
        ],
      },
    },
    {
      type: 'diagram',
      attrs: {
        kind: 'cycle',
        title: 'Wasserkreislauf',
        items: [
          { label: 'Verdunstung', text: 'Sonne erwärmt Wasser, es steigt als Dampf auf.' },
          { label: 'Kondensation', text: 'Dampf kühlt ab und bildet Wolken.' },
          { label: 'Niederschlag', text: 'Wasser fällt als Regen oder Schnee.' },
        ],
      },
    },
    p(t('Der eigenständige '), t('Zeitstrahl', ['bold']), t('-Block hat zusätzlich eine echte Zeitachse mit Zoom (Jahre, Daten, auch „v. Chr.“ und Zeiträume):')),
    {
      type: 'timeline',
      attrs: {
        title: 'Weimarer Republik bis Grundgesetz',
        layout: 'axis',
        entries: [
          { date: '1918', end: '1933', title: 'Weimarer Republik', text: 'Erste parlamentarische Demokratie in Deutschland.', color: 0 },
          { date: '1929', title: 'Weltwirtschaftskrise', text: 'Börsencrash in New York; Massenarbeitslosigkeit folgt.', color: 3 },
          { date: '23.05.1949', title: 'Grundgesetz', text: 'Gründung der Bundesrepublik Deutschland.', color: 2 },
        ],
      },
    },
    h2('Funktionsplotter'),
    p(t('Terme mit Schiebereglern für Parameter, Nullstellen/Extrema/Schnittpunkte, Zoom und Verschieben.')),
    {
      type: 'plot',
      attrs: {
        title: 'Sinus mit Parametern',
        fns: [
          { expr: 'a·sin(b·x)', color: 0 },
          { expr: '0.25x^2 - 2', color: 1 },
        ],
        params: [
          { name: 'a', value: 2, min: -5, max: 5, step: 0.1 },
          { name: 'b', value: 1, min: 0, max: 4, step: 0.05 },
        ],
        points: true,
      },
    },

    // ================= Rich Blocks =================
    h1('Rich Blocks'),
    h2('Notiz als Zeile / Karte'),
    p(t('Verweis auf eine andere Notiz – als schmale Zeile oder als Karte mit Vorschau. Mehrere Karten nebeneinander bilden ein Raster. Über „/“ eine bestehende Notiz suchen oder eine neue anlegen.')),
    tip(t('Einen Link auf eine Mitschrift-Notiz (aus der Seitenleiste hierher gezogen) kannst du per Klick auch nachträglich in eine Zeile oder Karte umwandeln.')),
    h2('Tabelle'),
    p(t('Klassische Tabelle mit Kopfzeile, Spalten per Ziehen in der Breite verstellbar.')),
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [p(t('Fach'))] },
            { type: 'tableHeader', content: [p(t('Note'))] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [p(t('Mathe'))] },
            { type: 'tableCell', content: [p(t('2'))] },
          ],
        },
      ],
    },
    h2('Sammlung'),
    p(t('Wie eine Mini-Datenbank: mehrere Tabellenblätter mit typisierten Feldern (Text, Zahl, Datum, Einzel-/Mehrfachauswahl, Verknüpfung zu anderen Zeilen …). Über „/“ einfügen, Felder per Klick auf den Spaltenkopf hinzufügen.')),
    {
      type: 'collection',
      attrs: {
        data: {
          id: 'handbuch-col',
          title: 'Sammlung',
          sheets: [
            {
              id: 'handbuch-sheet',
              name: 'Aufgaben',
              sort: null,
              fields: [
                { id: 'f-titel', name: 'Titel', type: 'text' },
                {
                  id: 'f-status',
                  name: 'Status',
                  type: 'select',
                  options: [
                    { id: 'o-offen', label: 'Offen', color: 'graphite' },
                    { id: 'o-erledigt', label: 'Erledigt', color: 'green' },
                  ],
                },
                { id: 'f-datum', name: 'Fällig', type: 'date' },
              ],
              rows: [
                { id: 'r1', cells: { 'f-titel': 'Referat vorbereiten', 'f-status': 'o-offen', 'f-datum': '2026-10-12' } },
                { id: 'r2', cells: { 'f-titel': 'Hausaufgaben Mathe', 'f-status': 'o-erledigt', 'f-datum': '2026-09-20' } },
              ],
            },
          ],
        },
      },
    },
    h2('Codeblock'),
    p(t('Syntax-Highlighting für ~35 Sprachen, Zeilennummern, Kopier-Knopf; Sprache oben am Block wählbar.')),
    { type: 'codeBlock', attrs: { language: 'python' }, content: [{ type: 'text', text: 'def gcd(a, b):\n    return a if b == 0 else gcd(b, a % b)' }] },
    h2('Mermaid'),
    p(t('Diagramme aus Text-Code: Flussdiagramm, Sequenz, Mindmap, Gantt … siehe '), t('mermaid.js.org', ['code']), t(' für die Syntax.')),
    {
      type: 'mermaid',
      attrs: {
        code: 'flowchart LR\n  A[Licht] --> B(Chlorophyll)\n  B --> C{Fotosynthese}\n  C -->|Produkt| D[Glucose]\n  C -->|Nebenprodukt| E[Sauerstoff]',
      },
    },
    h2('Whiteboard'),
    p(t('Freies Zeichnen (Excalidraw): Skizzen, Mindmaps, Handschrift. Ein Klick öffnet ein eigenes Zeichenfenster; in der Notiz steht eine Vorschau.')),
    { type: 'whiteboard', attrs: { scene: { elements: [], files: {} }, svg: '' } },
    note(t('Über „/“ → „Whiteboard“ einfügen – das Zeichenfenster öffnet sich direkt.')),
    h2('Abkürzungsverzeichnis'),
    p(t('Listet automatisch alle Glossar-Begriffe auf, die in dieser Notiz vorkommen (oder wahlweise alle aus dem '), t('Glossar', ['bold']), t(' in der Seitenleiste) – ohne Handarbeit.')),
    { type: 'glossaryList', attrs: { title: 'Abkürzungsverzeichnis', scope: 'note' } },
    h2('Formel'),
    p(
      t('Inline mit '),
      t('$…$', ['code']),
      t(', z. B. '),
      { type: 'mathInline', attrs: { latex: 'E = mc^2' } },
      t('. Ein eigener Formel-Block entsteht mit '),
      t('$$', ['code']),
      t(' + Leerzeichen oder Enter:'),
    ),
    { type: 'mathBlock', attrs: { latex: '\\int_0^1 x^2 \\, dx = \\frac{1}{3}' } },
    h2('Fußnote'),
    p(t('Im Text steht nur die hochgestellte Nummer, automatisch durchnummeriert'), { type: 'footnote', attrs: { text: 'So sieht eine Fußnote aus – Quelle, Zitat oder Anmerkung.' } }, t('. Ein Klick öffnet die Bearbeitung; unter der Notiz stehen alle gesammelt.')),

    // ================= Medien =================
    h1('Medien'),
    h2('Bild'),
    p(t('Datei hochladen, hineinziehen oder einen Bild-Link einfügen. Danach: Zuschneiden, Drehen, Filter, Textumfluss (wie in Word), Hintergrund entfernen.')),
    { type: 'image', attrs: { src: 'https://picsum.photos/seed/mitschrift/640/360' } },
    h2('Bildergalerie'),
    p(t('Mehrere Bilder als Raster, Mosaik, Karussell, Filmstreifen oder Vorher/Nachher-Vergleich. Über „/“ einfügen, dann Bilder hineinziehen.')),
    {
      type: 'gallery',
      attrs: {
        title: 'Fotos',
        layout: 'grid',
        columns: 2,
        fit: 'cover',
        captions: true,
        items: [
          { id: 'i1', src: 'https://picsum.photos/seed/mitschrift1/400/300', caption: 'Bild 1' },
          { id: 'i2', src: 'https://picsum.photos/seed/mitschrift2/400/300', caption: 'Bild 2' },
        ],
      },
    },
    h2('SVG-Grafik'),
    p(t('SVG-Code einfügen (Tastatur oder Ziehen einer .svg-Datei) – mit eigenem Editor für Farben, Linienstärke, Hintergrund, Drehung und Ausrichtung.')),
    {
      type: 'svg',
      attrs: {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#5B8DEF"/><circle cx="60" cy="40" r="22" fill="#fff"/></svg>',
      },
    },

    // ================= Trennlinien =================
    h1('Trennlinien'),
    p(t('Fünf Varianten über „/“: extra dünn (Punkte), dünn (gepunktet), regulär, fett – oder ein Seitenumbruch, der die Notiz in Druck-Seiten unterteilt (für den PDF-Export).')),
    { type: 'horizontalRule', attrs: { variant: 'dots' } },
    { type: 'horizontalRule', attrs: { variant: 'bold' } },

    // ================= Externe Links =================
    h1('Externe Links'),
    p(t('Einen Link auf eine externe Seite einfügen und danach per Klick in eine Zeile (Favicon, Titel, Domain), ein eingebettetes Bild, Video oder Audio umwandeln – erkennt YouTube, Vimeo, Spotify & Co. automatisch.')),
    { type: 'smartLink', attrs: { href: 'https://de.wikipedia.org/wiki/Photosynthese', view: 'row', title: 'Photosynthese – Wikipedia' } },

    // ================= Glossar (separat) =================
    h1('Glossar'),
    p(
      t('Über das Buch-Symbol in der Seitenleiste: eine Liste aller Fachbegriffe/Abkürzungen mit Erklärung. Ein Begriff wird in jeder Notiz automatisch unterstrichen und zeigt beim Überfahren seine Erklärung – ohne dass du ihn dort selbst verlinken musst. Das ist etwas anderes als der '),
      t('Abkürzungsverzeichnis', ['bold']),
      t('-Block oben, der nur die vorkommenden Begriffe auflistet.'),
    ),

    h1('Und sonst?'),
    p(
      t('Weitere Beispiele zu Formeln, Fußnoten, Taste sowie Markdown-Einfügen (z. B. '),
      t('$a^2+b^2=c^2$', ['code']),
      t(' oder '),
      t('[^1]', ['code']),
      t(') zeigt die Notiz „Showcase“ unter '),
      t('/showcase', ['code']),
      t('. Export (Markdown, HTML, PDF, Text, RTF) und Präsentationsmodus findest du oben rechts in jeder Notiz.'),
    ),
  ],
};
