import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, noteLink, ol, p, table, tip, ul, warning } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'organisieren',
  title: 'Notizen organisieren',
  parent: 'main',
  order: 50,
  section: 'Ordnung halten',
  doc: () => ({
    type: 'doc',
    content: [
      p('Mit der Zeit kommen viele Notizen zusammen. Mitschrift gibt dir mehrere Werkzeuge, um den Überblick zu behalten – du musst nicht alle nutzen. Viele kommen mit Unterseiten und ein paar Tags (zum Beispiel für Schulfächer) schon bestens aus.'),

      h2('Unterseiten'),
      p('Jede Notiz kann Unterseiten haben – und die wiederum eigene Unterseiten. So entsteht eine Gliederung wie in einem Ordner: etwa eine Notiz „Biologie“ mit den Unterseiten „Zellbiologie“, „Genetik“ und „Ökologie“.'),
      h3('Unterseite anlegen'),
      ul(
        ['In der Seitenleiste mit der Maus über eine Notiz fahren und auf das ', b('Plus'), ' klicken.'],
        [b('Ablage → Neue Unterseite'), ' bzw. ', kbd('⇧⌥⌘N'), ', während die Elternnotiz geöffnet ist.'],
        ['Beim Verlinken mit ', b('[['), ' eine neue Notiz direkt als Unterseite anlegen (', noteLink('verknuepfen', 'Verknüpfen & Graph'), ').'],
      ),
      p('Eine neue Unterseite übernimmt automatisch die Tags ihrer Elternnotiz.'),
      h3('Notizen umsortieren'),
      p('Zieh eine Notiz in der Seitenleiste auf eine andere, um sie zu deren Unterseite zu machen. Ziehst du sie auf eine freie Stelle der Liste, wandert sie zurück auf die oberste Ebene. Eine Notiz lässt sich nicht in ihre eigene Unterseite schieben – Mitschrift verhindert das.'),
      p('Oben in jeder Unterseite zeigt eine Pfadzeile (', b('Breadcrumbs'), '), wo sie einsortiert ist; ein Klick auf einen Eintrag bringt dich eine Ebene höher. Unter jeder Notiz listet Mitschrift außerdem automatisch ihre Unterseiten auf.'),

      h2('Tags'),
      p('Tags sind farbige Etiketten. Eine Notiz kann beliebig viele davon haben – „Mathe“, „Klausur“, „Referat“ … Anders als Unterseiten ordnen Tags eine Notiz nicht an einer Stelle ein, sondern quer durch alle Bereiche.'),
      h3('Tags vergeben und verwalten'),
      ol(
        ['Klicke unter dem Titel einer Notiz auf das ', b('Plus'), ' in der Tag-Zeile.'],
        ['Tippe einen Namen. Gibt es den Tag schon, wählst du ihn aus; sonst legt ', kbd('↵'), ' ihn neu an – mit einer Farbe, die noch kein anderer Tag hat.'],
        'Ein erneuter Klick auf einen gewählten Tag entfernt ihn wieder von der Notiz.',
      ),
      p('Über den Stift neben einem Tag änderst du seinen Namen und seine Farbe; dort kannst du ihn auch ganz löschen (die Notizen selbst bleiben natürlich erhalten).'),
      h3('Nach Tags filtern'),
      ul(
        [b('Seitenleiste:'), ' Rechts neben „Alle Notizen“ auf ', b('Tags'), ' klicken und einen Tag wählen. Die Liste zeigt dann nur noch passende Notizen; das × hebt den Filter auf. Solange ein Filter aktiv ist, bekommt jede neue Notiz diesen Tag automatisch.'],
        [b('Übersicht:'), ' Tags anklicken, um zu filtern, oder unter „Gruppieren“ nach Tags gruppieren.'],
        [b('Kalender und Glossar'), ' lassen sich ebenfalls nach Tags filtern.'],
      ),

      h2('Favoriten'),
      p('Notizen, die du ständig brauchst – den Stundenplan, die aktuelle Projektnotiz –, markierst du als Favorit. Sie stehen dann ganz oben in der Seitenleiste. Favorit wirst du über:'),
      ul(
        ['den Stern auf einer Kachel in der ', b('Übersicht'), ','],
        [b('Ablage → Zu Favoriten hinzufügen'), ','],
        ['den Reiter ', b('Info'), ' in der Block-Leiste.'],
      ),

      h2('Suchen'),
      table(
        ['Wo', 'Was es durchsucht'],
        [[b('Seitenleiste'), ' (', kbd('⌘F'), ')'], 'Titel, Inhalt und Tags – die Liste filtert sich beim Tippen.'],
        [[b('Suchen & Befehle'), ' (', kbd('⌘K'), ')'], 'Notizen mit Textausschnitt, dazu Blöcke, Befehle, Glossar und Handbuch.'],
        [b('Übersicht'), 'Titel und Inhalt, kombinierbar mit Tag-Filter und Sortierung.'],
      ),

      h2('Vorlagen'),
      p('Vorlagen ersparen dir, für wiederkehrende Notizen jedes Mal dasselbe Gerüst zu bauen. Klicke in der Seitenleiste auf den kleinen Pfeil neben ', b('Neue Notiz'), ' oder wähle ', b('Ablage → Neue Notiz aus Vorlage'), '. Mitgeliefert sind:'),
      table(
        ['Vorlage', 'Inhalt'],
        [b('Unterrichts-Mitschrift'), 'Thema, Kernaussagen, offene Fragen.'],
        [b('Klausur-Vorbereitung'), 'Themen-Sammlung mit Status-Board, Lernplan und Stolpersteinen.'],
        [b('Projekt / Gruppenarbeit'), 'Ziel und Beteiligte nebeneinander, dazu eine Aufgabenliste.'],
        [b('Cornell-Notizen'), 'Stichworte links, Notizen rechts, Zusammenfassung unten – eine bewährte Mitschreibmethode.'],
      ),
      h3('Eigene Vorlagen'),
      p('Jede Notiz kann selbst zur Vorlage werden: Öffne sie und wähle ', b('Ablage → Als Vorlage verwenden'), '. Sie erscheint dann im Vorlagen-Menü unter den mitgelieferten. Neue Notizen aus deiner Vorlage übernehmen ihren Inhalt und ihre Tags, der Titel bleibt leer. Ein zweiter Klick auf den Menüpunkt macht die Notiz wieder zu einer normalen Notiz.'),
      tip('Bau dir zum Beispiel eine Vorlage „Laborprotokoll“ mit den Überschriften Fragestellung, Material, Durchführung, Beobachtung und Auswertung.'),

      h2('Papierkorb'),
      p('Gelöschte Notizen verschwinden nicht sofort, sondern wandern in den Papierkorb (Seitenleiste → ', b('Mehr → Papierkorb'), '). Dort bleiben sie 30 Tage. Innerhalb dieser Zeit kannst du sie mit einem Klick wiederherstellen; danach löscht Mitschrift sie endgültig.'),
      ul(
        ['Löschen kannst du eine Notiz über das Papierkorb-Symbol in der Seitenleiste, über ', b('Ablage → Notiz löschen …'), ' oder im Reiter ', b('Info'), ' der Block-Leiste.'],
        'Hat die Notiz Unterseiten, bleiben diese erhalten und rücken eine Ebene nach oben.',
        ['Im Papierkorb holt ', b('Wiederherstellen'), ' eine Notiz zurück zu deinen Notizen. ', b('Endgültig löschen'), ' entfernt eine einzelne Notiz sofort, ', b('Papierkorb leeren'), ' alle auf einmal.'],
      ),
      warning('Endgültig gelöschte Notizen lassen sich nicht wiederherstellen – außer aus einem Backup (', noteLink('export', 'Export, Drucken & Backup'), ').'),
      note('Neue Notizen, in die du nichts geschrieben hast, räumt Mitschrift beim nächsten Start von selbst weg – sie landen gar nicht erst im Papierkorb.'),
    ],
  }),
};

export default page;
