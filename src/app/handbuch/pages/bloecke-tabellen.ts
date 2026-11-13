import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, h2, h3, kbd, note, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-tabellen',
  title: 'Tabellen & Sammlungen',
  parent: 'bloecke',
  order: 34,
  doc: () => ({
    type: 'doc',
    content: [
      p('Für Daten in Zeilen und Spalten gibt es zwei Blöcke: die einfache ', b('Tabelle'), ' – wie in Word – und die ', b('Sammlung'), ', eine kleine Datenbank mit Feldtypen, Ansichten, Filtern und Formeln. Faustregel: Willst du etwas nur übersichtlich darstellen, nimm eine Tabelle. Willst du damit arbeiten – sortieren, filtern, abhaken, im Kalender sehen – nimm eine Sammlung.'),

      h2('Tabelle'),
      p('Einfügen über ', b('/tabelle'), '. Du bekommst eine Tabelle mit drei Spalten, drei Zeilen und einer Kopfzeile. In den Zellen schreibst und formatierst du ganz normal; mit ', kbd('⇥'), ' springst du in die nächste Zelle.'),
      table(
        ['Fach', 'Klausur', 'Note'],
        ['Mathe', '12. Oktober', '2'],
        ['Biologie', '3. November', '1–2'],
        ['Englisch', '20. November', '–'],
      ),
      h3('Zeilen, Spalten und Zellen'),
      p('Klickst du in eine Zelle, zeigt die Optionsleiste die Tabellen-Werkzeuge:'),
      ul(
        [b('Zeile darunter'), ' / ', b('Spalte rechts'), ' – fügt neben der aktuellen Zelle ein.'],
        [b('Zeile anhängen'), ' / ', b('Spalte anhängen'), ' – ergänzt am Ende.'],
        [b('Zeile löschen'), ' / ', b('Spalte löschen'), '.'],
        [b('Zellen verbinden'), ' – markiere mehrere Zellen mit der Maus und fasse sie zu einer zusammen; ', b('Zelle teilen'), ' macht das rückgängig.'],
        [b('Kopfzeile an/aus'), ' – hebt die erste Zeile als Überschrift hervor.'],
      ),
      p('Die Spaltenbreite änderst du, indem du die Trennlinie zwischen zwei Spalten ziehst.'),

      h2('Sammlung'),
      p('Eine Sammlung ist eine Mini-Datenbank direkt in deiner Notiz – für Hausaufgaben, Lernthemen, Bücherlisten, Projekte oder Noten. Jede Spalte ist ein ', b('Feld'), ' mit festem Typ, jede Zeile ein Eintrag. Einfügen über ', b('/sammlung'), '.'),
      {
        type: 'collection',
        attrs: {
          data: {
            id: 'handbuch-col',
            title: 'Hausaufgaben',
            sheets: [
              {
                id: 'handbuch-sheet',
                name: 'Aufgaben',
                sort: null,
                fields: [
                  { id: 'f-titel', name: 'Aufgabe', type: 'text' },
                  {
                    id: 'f-fach',
                    name: 'Fach',
                    type: 'select',
                    options: [
                      { id: 'o-mathe', label: 'Mathe', color: 'blue' },
                      { id: 'o-bio', label: 'Biologie', color: 'green' },
                      { id: 'o-eng', label: 'Englisch', color: 'purple' },
                    ],
                  },
                  {
                    id: 'f-status',
                    name: 'Status',
                    type: 'select',
                    options: [
                      { id: 'o-offen', label: 'Offen', color: 'graphite' },
                      { id: 'o-arbeit', label: 'In Arbeit', color: 'amber' },
                      { id: 'o-erledigt', label: 'Erledigt', color: 'green' },
                    ],
                  },
                  { id: 'f-datum', name: 'Fällig', type: 'date' },
                  { id: 'f-punkte', name: 'Punkte', type: 'number' },
                ],
                rows: [
                  { id: 'r1', cells: { 'f-titel': 'Referat Zellaufbau', 'f-fach': 'o-bio', 'f-status': 'o-arbeit', 'f-datum': '2026-11-20', 'f-punkte': 12 } },
                  { id: 'r2', cells: { 'f-titel': 'Aufgaben S. 84, Nr. 3–7', 'f-fach': 'o-mathe', 'f-status': 'o-erledigt', 'f-datum': '2026-11-14', 'f-punkte': 9 } },
                  { id: 'r3', cells: { 'f-titel': 'Vokabeln Unit 4', 'f-fach': 'o-eng', 'f-status': 'o-offen', 'f-datum': '2026-11-18' } },
                ],
                views: [
                  { id: 'v-tab', name: 'Tabelle', type: 'table', filters: [] },
                  { id: 'v-board', name: 'Board', type: 'board', groupBy: 'f-status', filters: [] },
                  { id: 'v-kal', name: 'Kalender', type: 'calendar', dateFieldId: 'f-datum', filters: [] },
                ],
              },
            ],
          },
        },
      },
      p('Wechsle oben zwischen den Ansichten ', b('Tabelle'), ', ', b('Board'), ' und ', b('Kalender'), ' – es sind immer dieselben drei Aufgaben, nur anders dargestellt.'),

      h3('Felder und Feldtypen'),
      p('Über ', b('Feld hinzufügen'), ' (das Plus rechts neben den Spaltenköpfen) legst du ein neues Feld an. Ein Klick auf einen Spaltenkopf öffnet das Feld-Menü: Dort benennst du das Feld um, wechselst den Typ, wählst ein eigenes Symbol oder löschst es.'),
      table(
        ['Feldtyp', 'Wofür'],
        [b('Text'), 'Beliebiger Text – das erste Feld ist meist der Titel des Eintrags.'],
        [b('Nummer'), 'Zahlen wie Punkte, Preise oder Seitenzahlen.'],
        [b('Checkbox'), 'Ja/Nein zum Abhaken.'],
        [b('Datum'), 'Ein Tag – Grundlage für die Kalender-Ansicht.'],
        [b('URL, E-Mail, Telefon'), 'Werden als anklickbare Links angezeigt.'],
        [b('Einzelauswahl'), 'Genau eine Option aus einer Liste, z. B. Status oder Fach – mit Farbe.'],
        [b('Mehrfachauswahl'), 'Mehrere Optionen, z. B. Schlagwörter.'],
        [b('Verknüpfung'), 'Verweist auf Zeilen eines anderen Tabellenblatts – etwa jede Aufgabe auf ihr Fach.'],
        [b('Formel'), 'Berechnet einen Wert aus anderen Feldern (siehe unten).'],
        [b('Rollup'), 'Fasst die Werte verknüpfter Zeilen zusammen: Anzahl, Summe, Durchschnitt, Minimum, Maximum, Liste oder Prozent abgehakt.'],
      ),
      p('Optionen für Einzel- und Mehrfachauswahl legst du direkt in der Zelle an: Tippe einen neuen Namen in das Suchfeld, und er wird zur Option.'),

      h3('Tabellenblätter'),
      p('Eine Sammlung kann mehrere ', b('Tabellenblätter'), ' haben – wie die Reiter in einer Tabellenkalkulation. Das Plus neben den Blatt-Reitern fügt eines hinzu. So kannst du etwa ein Blatt „Fächer“ und ein Blatt „Aufgaben“ anlegen und die beiden mit einem Verknüpfungsfeld verbinden. Ein Rollup im Blatt „Fächer“ zählt dann zum Beispiel, wie viele Aufgaben pro Fach noch offen sind.'),
      tip('Über ', b('Diagramm'), ' in der Optionsleiste (Beziehungsdiagramm einfügen) zeichnet Mitschrift aus allen Sammlungen der Notiz ein Diagramm: jedes Tabellenblatt als Kasten mit seinen Feldern, jede Verknüpfung als Linie dazwischen.'),

      h3('Ansichten'),
      p('Eine Ansicht zeigt die Zeilen eines Blatts auf eine bestimmte Art. Jedes Blatt kann beliebig viele Ansichten haben – das Plus neben den Ansicht-Reitern legt eine neue an.'),
      table(
        ['Ansicht', 'So sieht sie aus'],
        [b('Tabelle'), 'Klassische Zeilen und Spalten.'],
        [b('Board'), 'Karten in Spalten, gruppiert nach einem Auswahlfeld (z. B. Offen · In Arbeit · Erledigt). Karten lassen sich zwischen den Spalten ziehen – das ändert den Wert.'],
        [b('Galerie'), 'Große Karten nebeneinander.'],
        [b('Liste'), 'Schlanke Liste mit den wichtigsten Feldern.'],
        [b('Kalender'), 'Monatskalender nach einem Datumsfeld. Ziehst du einen Eintrag auf einen anderen Tag, ändert sich sein Datum.'],
      ),
      p('Rechts neben den Reitern stellst du für die aktive Ansicht ', b('Filter'), ', ', b('Sortierung'), ' und ', b('Gruppierung'), ' ein. Filter vergleichen ein Feld mit einem Wert („enthält“, „ist“, „größer als“, „vor“, „nach“, „abgehakt“, „leer“ …), und mehrere Filter gelten zusammen. Ein Klick auf den aktiven Reiter öffnet sein Menü: umbenennen, Darstellung wechseln, duplizieren oder löschen.'),
      note('Filter und Sortierung blenden nur aus und ordnen um – es geht nie eine Zeile verloren. Eine Ansicht „Noch offen“ mit dem Filter Status ist nicht Erledigt ist schnell gebaut und spart viel Suchen.'),

      h3('Zeile als Dokument'),
      p('Manchmal braucht ein Eintrag mehr Platz als eine Zelle – etwa Notizen zu einem Referat. Fahr in der Tabellen-Ansicht über eine Zeile und klicke beim ersten Feld auf ', b('Als Dokument öffnen'), '. Mitschrift legt dann eine eigene Notiz für diese Zeile an (als Unterseite der aktuellen Notiz). Später führt derselbe Knopf als ', b('Dokument öffnen'), ' direkt dorthin.'),

      h3('Formeln'),
      p('Ein Formelfeld rechnet mit den Werten anderer Felder. Feldnamen stehen in geschweiften Klammern, Argumente trennst du mit Semikolon:'),
      table(
        ['Formel', 'Ergebnis'],
        [code('{Punkte} / {Maximum} * 100'), 'Prozent der erreichten Punkte'],
        [code('wenn({Note} <= 4; "bestanden"; "nicht bestanden")'), 'Text abhängig von einer Bedingung'],
        [code('tage(heute(); {Abgabe})'), 'Tage bis zur Abgabe'],
        [code('runden({Schnitt}; 1)'), 'Auf eine Nachkommastelle gerundet'],
      ),
      p('Weitere Funktionen: ', code('summe'), ', ', code('mittel'), ', ', code('min'), ', ', code('max'), ', ', code('verketten'), ', ', code('länge'), ', ', code('leer'), ' und ', code('enthält'), '. Der Formel-Editor zeigt dir beim Tippen eine Hilfe und meldet Fehler, bevor du speicherst.'),

      h2('Verknüpfte Sammlung'),
      p('Eine verknüpfte Sammlung zeigt eine bereits vorhandene Sammlung an einer anderen Stelle – in derselben oder in einer ganz anderen Notiz – mit eigenen Ansichten, Filtern und Sortierungen. Die Zeilen selbst bleiben in der ursprünglichen Sammlung: Änderst du hier etwas, ändert es sich dort auch.'),
      ol(
        ['Tippe ', b('/verknüpfte sammlung'), '.'],
        'Wähle aus der Liste die Sammlung, die du anzeigen möchtest.',
        'Lege Ansichten an, die hierher passen – etwa nur die Aufgaben eines Fachs.',
      ),
      tip('So kannst du eine zentrale Aufgaben-Sammlung führen und in jeder Fach-Notiz eine verknüpfte Ansicht einbauen, die nur die Aufgaben dieses Fachs zeigt. ', 'Ein Klick auf den Quellverweis im Block bringt dich jederzeit zum Original.'),
    ],
  }),
};

export default page;
