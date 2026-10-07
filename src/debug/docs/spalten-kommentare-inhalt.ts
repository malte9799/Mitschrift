import type { DebugDoc } from '../debugDocs';

const text = (t: string, marks?: object[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const p = (...content: object[]) => ({ type: 'paragraph', content });
const h = (level: number, t: string) => ({ type: 'heading', attrs: { level }, content: [text(t)] });
const column = (...content: object[]) => ({ type: 'column', content });
const comment = (id: string) => [{ type: 'comment', attrs: { id } }];

/** Spalten-Layout, Inhaltsverzeichnis, Kommentare (als Randnotizen) und Notiz-Vorlagen. */
const doc: DebugDoc = {
  key: 'spalten-kommentare-inhalt',
  title: 'Debug: Spalten, Inhaltsverzeichnis, Kommentare',
  doc: {
    type: 'doc',
    content: [
      p(text('Zum Testen: Text markieren → Sprechblasen-Knopf in der Toolbar (oder ⌥⌘M) legt einen Kommentar als Randnotiz an. Klick auf eine gelb markierte Stelle hebt ihren Kommentar hervor, Maus über dem Kommentar die Stelle. „Erledigt“ im Menü der Notiz entfernt beides.')),
      p(text('Vorlagen: Pfeil neben „Neue Notiz“ in der Seitenleiste, oder Ablage → Neue Notiz aus Vorlage. Eigene Vorlage: Ablage → „Als Vorlage verwenden“.')),
      { type: 'toc', attrs: { depth: 3 } },
      h(2, 'Spalten'),
      p(text('Über „/spalten“ einfügen. In der Leiste: Spalte hinzufügen/entfernen, Breiten (bei zwei Spalten), auflösen.')),
      {
        type: 'columns',
        attrs: { layout: 'equal' },
        content: [
          column(h(3, 'TCP'), { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('verbindungsorientiert'))] }, { type: 'listItem', content: [p(text('zuverlässig, geordnet'))] }] }),
          column(h(3, 'UDP'), { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('verbindungslos'))] }, { type: 'listItem', content: [p(text('schnell, ohne Garantie'))] }] }),
        ],
      },
      {
        type: 'columns',
        attrs: { layout: 'wide-left' },
        content: [
          column(p(text('Zwei Drittel: der Fließtext. Das OSI-Modell teilt Netzwerkkommunikation in sieben Schichten, von der Bitübertragung bis zur Anwendung.'))),
          column({ type: 'callout', attrs: { variant: 'tip' }, content: [p(text('Ein Drittel: Merkkasten am Rand.'))] }),
        ],
      },
      h(2, 'Kommentare'),
      p(
        text('Der '),
        text('Three-Way-Handshake', comment('dbg-comment-1')),
        text(' baut eine TCP-Verbindung auf. Danach regelt das '),
        text('Sliding Window', comment('dbg-comment-2')),
        text(' den Datenfluss.'),
      ),
      h(3, 'Unterpunkt für das Inhaltsverzeichnis'),
      p(text('Das Inhaltsverzeichnis oben listet alle Überschriften – auch die in den Spalten – und springt per Klick dorthin.')),
    ],
    sideNotes: [
      { id: 'dbg-comment-1', pos: 0, dy: 0, side: 'right', style: 'card', color: 'yellow', title: 'SYN, SYN-ACK, ACK', body: 'Reihenfolge für die Klausur merken.', tags: ['Prüfungsrelevant'], comment: true, quote: 'Three-Way-Handshake' },
      { id: 'dbg-comment-2', pos: 0, dy: 0, side: 'right', style: 'card', color: 'blue', title: 'Nachfragen', body: 'Wie groß ist das Fenster am Anfang?', tags: ['Frage'], comment: true, quote: 'Sliding Window' },
    ],
  },
};

export default doc;
