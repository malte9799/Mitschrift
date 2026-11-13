/** Kapitel „Mit Blöcken arbeiten“: Bedienung aller Blöcke; die Blocktypen selbst stehen in den Unterseiten bloecke-*.ts. */
import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, noteLink, ol, p, pageLink, table, tip, ul, warning } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke',
  title: 'Mit Blöcken arbeiten',
  parent: 'main',
  order: 30,
  section: 'Grundlagen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Eine Notiz in Mitschrift besteht aus ', b('Blöcken'), '. Jeder Absatz ist ein Block, jede Überschrift, jede Liste – und eben auch Tabellen, Bilder, Karteikarten, Diagramme oder Whiteboards. Blöcke lassen sich einfügen, verschieben, markieren, kopieren und umwandeln. Dieses Kapitel zeigt dir, wie das geht; die einzelnen Blocktypen stellen dir die Unterseiten am Ende vor.'),

      h2('Blöcke einfügen'),
      p('Es gibt mehrere Wege – nimm den, der dir am besten liegt:'),
      h3('1. Mit „/“ – der schnellste Weg'),
      ol(
        ['Setze den Cursor in eine leere Zeile (oder tippe nach einem Leerzeichen).'],
        ['Tippe ', b('/'), '. Es öffnet sich das Einfügen-Menü mit allen Blöcken.'],
        ['Tippe weiter, um zu filtern – etwa ', b('/tab'), ' für Tabelle oder ', b('/karte'), ' für Karteikarten. Auch Stichwörter wie „todo“, „vokabeln“ oder „mathe“ funktionieren.'],
        ['Wähle mit den Pfeiltasten und bestätige mit ', kbd('↵'), ' – oder klicke einfach.'],
      ),
      p('Ist die Zeile leer, ersetzt der neue Block sie. Steht schon Text darin, kommt der Block in die Zeile darunter.'),
      h3('2. Über die Block-Leiste'),
      p('Der Knopf ', b('Blöcke & Format'), ' oben rechts in der Notiz (oder ', kbd('⇧⌘B'), ', wenn nichts markiert ist) öffnet rechts die Block-Leiste. Im Reiter ', b('Einfügen'), ' stehen alle Blöcke mit kleinem Vorschaubild, sortiert nach Kategorie. Ein Klick fügt den Block an der Cursor-Position ein. Die Block-Leiste hat noch zwei weitere Reiter: ', b('Format'), ' (Textstile, Farben, Ausrichtung) und ', b('Info'), ' (Erstellt, Geändert, Anzahl Wörter und Blöcke, Favorit, Löschen).'),
      h3('3. Über das Menü oder ⌘K'),
      p('Das Menü ', b('Einfügen'), ' oben in der Menüleiste listet ebenfalls alle Blöcke. Und in der Suche mit ', kbd('⌘K'), ' findest du sie unter „Blöcke einfügen“.'),

      h2('Blöcke verschieben'),
      p('Fährst du mit der Maus über einen Block, erscheint links daneben ein ', b('Griff'), ' (sechs Punkte). Zieh ihn nach oben oder unten – eine Linie zeigt, wo der Block landen wird. Lass los, und der Block sitzt an der neuen Stelle.'),

      h2('Blöcke markieren'),
      p('Um mehrere Blöcke auf einmal zu bearbeiten, markierst du sie als Ganzes – statt nur ihren Text:'),
      ul(
        [b('Rechteck aufziehen:'), ' Klicke in einen leeren Bereich – den Rand neben dem Text oder unter der Notiz – und ziehe mit gedrückter Maustaste über die Blöcke. Alle überstrichenen Blöcke werden markiert.'],
        [b('Klicken:'), ' Bei Blöcken wie Bildern, Tabellen oder Diagrammen markiert der erste Klick den ganzen Block, erst der zweite geht hinein. Mit ', kbd('⌘'), '-Klick nimmst du weitere Blöcke dazu, mit ', kbd('⇧'), '-Klick markierst du alles bis zur angeklickten Stelle.'],
        [b('Alles:'), ' ', kbd('⌘A'), ' markiert alle Blöcke der Notiz. (Im Codeblock markiert das erste ', kbd('⌘A'), ' nur den Code, ein zweites dann alles.)'],
      ),
      p('Mit markierten Blöcken kannst du:'),
      table(
        ['Aktion', 'So geht’s'],
        ['Kopieren / Ausschneiden', [kbd('⌘C'), ' / ', kbd('⌘X')]],
        ['Löschen', [kbd('⌫'), ' oder ', kbd('Entf')]],
        ['Gemeinsam verschieben', 'Markierte Blöcke anfassen und an die neue Stelle ziehen'],
        ['Gemeinsam formatieren', 'Im Format-Reiter z. B. alle zu einer Liste machen oder einfärben'],
        ['Listenpunkte einrücken', [kbd('⇥'), ' bzw. ', kbd('⇧⇥')]],
        ['In den Block springen', [kbd('↵'), ' setzt den Cursor ans Ende des ersten markierten Blocks']],
        ['Markierung aufheben', kbd('Esc')],
      ),

      h2('Die Optionsleiste unter dem Block'),
      p('Sobald du in einem Block arbeitest oder ihn markierst, erscheint mittig darunter eine kleine ', b('Optionsleiste'), '. Sie zeigt genau die Einstellungen, die zu diesem Block passen: bei einem Bild etwa Bearbeiten, Größe, Textumbruch und Rahmen, bei einem Hinweis-Kasten den Stil, bei einer Galerie die Darstellung. Rechts in der Leiste sitzen außerdem ', b('Duplizieren'), ' und ', b('Löschen'), '; manche Blöcke bieten zusätzlich ', b('Umwandeln in'), ' – etwa eine SVG-Grafik in ein Whiteboard.'),
      tip('Markierst du mehrere Blöcke desselben Typs – zum Beispiel drei Bilder – zeigt die Leiste die Optionen des ersten. Was du dort änderst, gilt dann für alle markierten. Mehrere markierte Bilder kannst du außerdem mit einem Klick zu einer Galerie zusammenfassen.'),

      h2('Schutz vor versehentlichem Löschen'),
      p('Normaler Text verschwindet beim Löschen sofort. Bei aufwendigen Blöcken – Whiteboards, Tabellen, Sammlungen, Karteikarten und ähnlichen – fragt Mitschrift vorher nach, egal ob du per Taste, Ausschneiden oder Markierung löschst. Leere Whiteboards und Codeblöcke dürfen ohne Nachfrage weg.'),
      warning('Hast du doch etwas zu viel gelöscht? ', kbd('⌘Z'), ' holt es zurück – auch ganze Blöcke.'),

      h2('Layout: Spalten und Inhaltsverzeichnis'),
      p('Mit den Blöcken ', b('2 Spalten'), ' und ', b('3 Spalten'), ' stellst du Inhalte nebeneinander – etwa Fließtext links und einen Merkkasten rechts. In jede Spalte passen beliebige Blöcke. In der Optionsleiste fügst du Spalten hinzu (bis zu vier), entfernst die letzte, stellst bei zwei Spalten die Breiten ein (gleich breit, links breiter, rechts breiter) oder löst die Spalten wieder auf. Auf schmalen Bildschirmen rutschen die Spalten automatisch untereinander.'),
      p('Der Block ', b('Inhaltsverzeichnis'), ' listet alle Überschriften der Notiz – auch die in Spalten – und springt per Klick dorthin. Er aktualisiert sich von selbst, sobald du Überschriften änderst.'),

      h2('Alle Blocktypen'),
      p('Jeder Blocktyp mit Erklärung und einem echten Beispiel zum Ausprobieren:'),
      ...pageLink('bloecke-text', 'Text, Listen & Hervorheben', 'Überschriften, Listen, Aufgaben, Aufklapp-Blöcke, Zitate, Hinweis-Kästen und Trennlinien.'),
      ...pageLink('bloecke-lernen', 'Lernblöcke', 'Lückentext, Karteikarten und Quiz – die Herzstücke des Lernmodus.'),
      ...pageLink('bloecke-diagramme', 'Diagramme & Zeitstrahl', 'Ablauf, Balken, Kreislauf, Zeitstrahl, Funktionsplotter und Mermaid.'),
      ...pageLink('bloecke-tabellen', 'Tabellen & Sammlungen', 'Einfache Tabellen und Sammlungen – Mini-Datenbanken mit Feldern, Ansichten und Formeln.'),
      ...pageLink('bloecke-medien', 'Bilder, Medien & Dateien', 'Bilder bearbeiten, Galerien, Whiteboard, SVG-Grafiken, Datei-Anhänge und eingebettete Links.'),
      ...pageLink('bloecke-formeln-code', 'Formeln, Code & Fußnoten', 'Mathematische Formeln, Codeblöcke mit Vollbild-Editor, Fußnoten und das Abkürzungsverzeichnis.'),
      note('Verweise auf andere Notizen (', b('Notiz als Zeile'), ' und ', b('Notiz als Karte'), ') erklärt das Kapitel ', noteLink('verknuepfen', 'Verknüpfen & Graph'), '.'),
    ],
  }),
};

export default page;
