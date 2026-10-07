import type { HandbuchPage } from '@/app/handbuch/registry';
import { h2, p, t, tip } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-tabellen',
  title: 'Tabellen, Sammlung & Code',
  parent: 'bloecke',
  doc: () => ({
    type: 'doc',
    content: [
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
    ],
  }),
};

export default page;
