import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'randnotizen',
  title: 'Randnotizen & Kommentare',
  parent: 'main',
  order: 70,
  section: 'Ordnung halten',
  doc: () => ({
    type: 'doc',
    content: [
      p('Manchmal will man etwas neben den Text schreiben, ohne den Text selbst zu verändern – eine Frage an die Lehrerin, eine Erinnerung, ein „Das kommt in der Klausur!“. Dafür gibt es Randnotizen und Kommentare. Sie stehen im linken oder rechten Rand neben der Stelle, zu der sie gehören, und wandern mit, wenn sich der Text verschiebt.'),

      h2('Randnotiz anlegen'),
      ol(
        ['Mach einen ', b('Doppelklick'), ' in den freien Rand links oder rechts neben dem Text – auf Höhe der Stelle, an die die Notiz gehört.'],
        'Eine neue Randnotiz erscheint. Gib ihr einen Titel und – wenn du magst – einen kurzen Text.',
        'Klick irgendwo anders hin. Fertig.',
      ),
      p('Eine leere Randnotiz verschwindet von selbst, sobald du sie verlässt. Du kannst also ruhig zum Ausprobieren in den Rand klicken.'),

      h2('Aussehen anpassen'),
      p('Über das Menü an der Randnotiz (', b('Darstellung, Farbe, Seite'), ') stellst du ein:'),
      table(
        ['Darstellung', 'Wie sie aussieht'],
        [b('Post-it'), 'Farbiger Zettel, leicht schräg aufgeklebt – der Standard.'],
        [b('Karte'), 'Titel und Text in einem Rahmen.'],
        [b('Text'), 'Titel und Text ohne Rahmen – unaufdringlich.'],
        [b('Nur Titel'), 'Eine einzige schlichte Zeile.'],
      ),
      ul(
        [b('Farbe:'), ' Gelb, Pink, Blau, Grün, Lila oder Grafit.'],
        [b('Seite:'), ' ', b('In den rechten Rand'), ' bzw. ', b('In den linken Rand'), ' verschiebt die Notiz auf die andere Seite.'],
        [b('Löschen'), ' entfernt sie.'],
      ),
      p('Neue Randnotizen übernehmen die Darstellung, die du zuletzt gewählt hast.'),

      h3('Labels'),
      p('Randnotizen können Labels tragen – kleine farbige Schlagwörter. Mitschrift schlägt dir ', b('Prüfungsrelevant'), ', ', b('Wichtig'), ', ', b('Wiederholen'), ', ', b('Frage'), ' und ', b('Verstanden'), ' vor; eigene Labels legst du an, indem du einfach einen neuen Namen tippst.'),
      tip('Mit Labels wie „Prüfungsrelevant“ und „Frage“ siehst du beim Durchblättern sofort, wo du beim Lernen genauer hinschauen solltest.'),

      h2('Kommentare'),
      p('Ein Kommentar ist eine Randnotiz, die zu einer bestimmten Textstelle gehört:'),
      ol(
        'Markiere den Text, den du kommentieren möchtest.',
        ['Klicke in der Formatleiste auf die Sprechblase ', b('Kommentieren'), ' – oder drücke ', kbd('⌥⌘M'), '.'],
        'Die Stelle wird farbig hinterlegt, und im Rand öffnet sich der Kommentar. Schreib los.',
      ),
      p('Klickst du später auf die markierte Stelle, hebt Mitschrift den zugehörigen Kommentar hervor; fährst du mit der Maus über den Kommentar, leuchtet umgekehrt die Textstelle auf. Hat sich der Punkt erledigt, entfernt ', b('Erledigt – Kommentar entfernen'), ' im Menü des Kommentars beides: den Kommentar und die Markierung.'),

      h2('Auf schmalen Bildschirmen'),
      p('Ist neben dem Text nicht genug Platz – etwa auf einem kleinen Laptop oder bei eingeblendeter Block-Leiste –, schrumpfen Randnotizen zu kleinen ', b('Pins'), ' am Rand. Ein Klick auf einen Pin klappt die Notiz auf. Liegen mehrere Notizen auf gleicher Höhe, stapelt Mitschrift sie ordentlich untereinander.'),
      note('Randnotizen und Kommentare werden mit der Notiz gespeichert, erscheinen aber nicht im Präsentationsmodus.'),
    ],
  }),
};

export default page;
