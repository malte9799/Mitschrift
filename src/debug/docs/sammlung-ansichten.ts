import type { DebugDoc } from '../debugDocs';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });

// Daten relativ zu heute, damit die Kalender-Ansicht immer etwas zeigt.
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const offen = 'st-offen';
const arbeit = 'st-arbeit';
const fertig = 'st-fertig';

const task = (id: string, title: string, status: string, fach: string, due: number, punkte: number | null, max: number, done = false) => ({
  id,
  cells: { 'a-titel': title, 'a-status': status, 'a-fach': fach, 'a-abgabe': day(due), 'a-punkte': punkte, 'a-max': max, 'a-erledigt': done },
});

const collection = {
  id: 'dbg-schule',
  title: 'Schuljahr',
  sheets: [
    {
      id: 'sh-aufgaben',
      name: 'Aufgaben',
      fields: [
        { id: 'a-titel', name: 'Titel', type: 'text' },
        {
          id: 'a-status',
          name: 'Status',
          type: 'select',
          options: [
            { id: offen, label: 'Offen', color: 'graphite' },
            { id: arbeit, label: 'In Arbeit', color: 'amber' },
            { id: fertig, label: 'Erledigt', color: 'green' },
          ],
        },
        { id: 'a-fach', name: 'Fach', type: 'relation', relation: { collectionId: 'dbg-schule', sheetId: 'sh-faecher' } },
        { id: 'a-abgabe', name: 'Abgabe', type: 'date' },
        { id: 'a-punkte', name: 'Punkte', type: 'number' },
        { id: 'a-max', name: 'Maximum', type: 'number' },
        { id: 'a-prozent', name: 'Prozent', type: 'formula', formula: 'wenn(leer({Punkte}); ""; runden({Punkte} / {Maximum} * 100))' },
        { id: 'a-rest', name: 'Tage übrig', type: 'formula', formula: 'tage(heute(); {Abgabe})' },
        { id: 'a-erledigt', name: 'Erledigt', type: 'checkbox' },
      ],
      rows: [
        task('r1', 'Subnetting-Übungsblatt', fertig, 'f1', -6, 18, 20, true),
        task('r2', 'Präsentation OSI-Modell', arbeit, 'f1', 3, null, 30),
        task('r3', 'ER-Diagramm Bibliothek', offen, 'f2', 8, null, 25),
        task('r4', 'SQL-Abfragen Teil 2', fertig, 'f2', -2, 21, 25, true),
        task('r5', 'Essay: Remote Work', arbeit, 'f3', 5, null, 15),
        task('r6', 'Vokabeltest Unit 4', offen, 'f3', 12, null, 40),
      ],
      views: [
        { id: 'v-tabelle', name: 'Alle', type: 'table', sort: { fieldId: 'a-abgabe', dir: 'asc' }, filters: [] },
        { id: 'v-board', name: 'Board', type: 'board', groupBy: 'a-status', filters: [] },
        { id: 'v-kalender', name: 'Kalender', type: 'calendar', dateFieldId: 'a-abgabe', filters: [] },
        { id: 'v-offen', name: 'Noch offen', type: 'list', sort: { fieldId: 'a-abgabe', dir: 'asc' }, filters: [{ id: 'fl1', fieldId: 'a-erledigt', op: 'unchecked' }] },
        { id: 'v-galerie', name: 'Nach Fach', type: 'gallery', groupBy: 'a-fach', filters: [] },
      ],
    },
    {
      id: 'sh-faecher',
      name: 'Fächer',
      fields: [
        { id: 'f-titel', name: 'Fach', type: 'text' },
        { id: 'f-aufgaben', name: 'Aufgaben', type: 'relation', relation: { collectionId: 'dbg-schule', sheetId: 'sh-aufgaben' }, relationMulti: true },
        { id: 'f-anzahl', name: 'Anzahl', type: 'rollup', rollup: { relationFieldId: 'f-aufgaben', targetFieldId: '', fn: 'count' } },
        { id: 'f-schnitt', name: 'Ø Prozent', type: 'rollup', rollup: { relationFieldId: 'f-aufgaben', targetFieldId: 'a-prozent', fn: 'avg' } },
        { id: 'f-fertig', name: 'Erledigt %', type: 'rollup', rollup: { relationFieldId: 'f-aufgaben', targetFieldId: 'a-erledigt', fn: 'percentChecked' } },
      ],
      rows: [
        { id: 'f1', cells: { 'f-titel': 'Lernfeld 3 – Netzwerke', 'f-aufgaben': ['r1', 'r2'] } },
        { id: 'f2', cells: { 'f-titel': 'Lernfeld 5 – Datenbanken', 'f-aufgaben': ['r3', 'r4'] } },
        { id: 'f3', cells: { 'f-titel': 'Englisch', 'f-aufgaben': ['r5', 'r6'] } },
      ],
    },
  ],
};

/** Sammlung als Datenbank: Ansichten, Filter, Gruppen, Formeln, Rollups, Zeilen als Dokument, verknüpfte Sammlung. */
const doc: DebugDoc = {
  key: 'sammlung-ansichten',
  title: 'Debug: Sammlung – Ansichten, Formeln, Zeilen-Dokumente',
  doc: {
    type: 'doc',
    content: [
      p('Zum Testen: oben zwischen den Ansichten wechseln (Alle, Board, Kalender, Noch offen, Nach Fach). Im Board Karten zwischen den Spalten ziehen, im Kalender auf einen anderen Tag. Klick auf eine Karte klappt die Zeile auf.'),
      p('Filter, Sortieren und Gruppe rechts gelten nur für die aktive Ansicht. Klick auf den aktiven Reiter: umbenennen, Darstellung wechseln, duplizieren, löschen.'),
      p('In der Tabelle über eine Zeile fahren → „Öffnen“ legt ein Dokument für die Zeile an (Unterseite dieser Notiz). „Prozent“ und „Tage übrig“ sind Formeln; im Blatt „Fächer“ stehen Rollups über die verknüpften Aufgaben.'),
      { type: 'collection', attrs: { data: collection } },
      h2('Verknüpfte Sammlung'),
      p('Unten „Schuljahr“ wählen: dieselben Zeilen, aber mit eigenen Ansichten und Filtern. Änderungen wirken in beiden Blöcken. Der Block funktioniert genauso in einer anderen Notiz.'),
      { type: 'linkedCollection', attrs: { noteId: null, collectionId: null, views: {} } },
    ],
  },
};

export default doc;
