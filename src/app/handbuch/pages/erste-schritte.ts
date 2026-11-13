import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'erste-schritte',
  title: 'Erste Schritte',
  parent: 'main',
  order: 10,
  section: 'Grundlagen',
  doc: () => ({
    type: 'doc',
    content: [
      p('In diesem Kapitel lernst du die Oberfläche von Mitschrift kennen und legst deine erste Notiz an. Danach weißt du, wo was ist – alles Weitere findest du in den folgenden Kapiteln.'),

      h2('Die Oberfläche im Überblick'),
      p('Mitschrift besteht aus drei Bereichen:'),
      ul(
        [b('Menüleiste'), ' ganz oben – wie in einem Desktop-Programm, mit den Menüs Mitschrift, Ablage, Bearbeiten, Format, Einfügen, Darstellung und Hilfe. Hier findest du jeden Befehl samt Tastenkürzel.'],
        [b('Seitenleiste'), ' links – deine Notizen, die Suche und der Weg zu Graph, Kalender, Glossar, Papierkorb und diesem Handbuch.'],
        [b('Arbeitsfläche'), ' in der Mitte – die geöffnete Notiz oder eine der Ansichten (Übersicht, Kalender, Graph …).'],
      ),

      h3('Die Seitenleiste'),
      p('Von oben nach unten findest du in der Seitenleiste:'),
      ul(
        [b('Mitschrift'), ' – ein Klick auf das Logo bringt dich zur Übersicht. Daneben wechselt der kleine farbige Punkt reihum das Farbschema.'],
        [b('Suchen'), ' – filtert die Notizliste nach Titel, Inhalt und Tags, während du tippst (', kbd('⌘F'), ').'],
        [b('Neue Notiz'), ' – legt eine leere Notiz an. Der kleine Pfeil daneben öffnet die Vorlagen.'],
        [b('Graph-Ansicht'), ' und ', b('Kalender'), ' – zwei eigene Ansichten, mehr dazu in ', noteLink('verknuepfen', 'Verknüpfen & Graph'), ' und ', noteLink('kalender', 'Kalender & Aufgaben'), '.'],
        [b('Mehr'), ' – Übersicht, Handbuch, Glossar und Papierkorb.'],
        [b('Favoriten'), ' – Notizen, die du mit einem Stern markiert hast, stehen ganz oben.'],
        [b('Alle Notizen'), ' – deine Notizen als Baum. Unterseiten klappst du mit dem kleinen Pfeil auf und zu. Rechts neben der Überschrift filterst du nach einem Tag.'],
      ),
      p('Wenn du in der Seitenleiste nach unten scrollst, schrumpfen die Knöpfe zu einer kompakten Symbolzeile im Kopf – so bleibt mehr Platz für deine Notizen. Mit ', kbd('⌘B'), ' blendest du die ganze Seitenleiste aus und wieder ein (solange kein Text markiert ist – sonst macht ', kbd('⌘B'), ' den Text fett).'),

      h3('Die Übersicht'),
      p('Die Übersicht ist deine Startseite: alle Notizen als Kacheln mit Titel und Textanfang. Oben kannst du sie anpassen:'),
      table(
        ['Einstellung', 'Was sie bewirkt'],
        [b('Suche'), 'Durchsucht Titel und Inhalt aller Notizen.'],
        [b('Gruppieren'), 'Keine Gruppen, nach Tags oder nach Datum (Heute, Gestern, Letzte 7 Tage …).'],
        [b('Sortieren'), 'Nach „Bearbeitet“, „Zuletzt angesehen“, „Erstellt“ oder „Name“ – jeweils auf- oder absteigend.'],
        [b('Größe S / M / L'), 'Wie groß die Kacheln sind.'],
        [b('Darstellung'), 'Raster, Mosaik (Kacheln unterschiedlich hoch) oder schlichte Liste.'],
        [b('Tags'), 'Ein Klick auf einen Tag zeigt nur noch Notizen mit diesem Tag.'],
      ),
      p('Über den Stern auf einer Kachel nimmst du eine Notiz in die Favoriten auf. Mitschrift merkt sich deine Einstellungen.'),

      h2('Deine erste Notiz'),
      ol(
        ['Klicke in der Seitenleiste auf ', b('Neue Notiz'), ' oder drücke ', kbd('⌥⌘N'), '.'],
        ['Tippe einen Titel, zum Beispiel „Biologie – Zellaufbau“.'],
        ['Drücke ', kbd('↵'), ' – der Cursor springt in den Text darunter.'],
        ['Schreib einfach los. Tippe ', b('/'), ' in einer leeren Zeile, um einen Block wie eine Liste, Tabelle oder Karteikarten einzufügen.'],
      ),
      p('Unter dem Titel siehst du die Tag-Zeile. Mit dem Plus fügst du Tags wie Schulfächer hinzu – mehr dazu in ', noteLink('organisieren', 'Notizen organisieren'), '.'),
      note('Es gibt keinen Speichern-Knopf: Mitschrift speichert jede Änderung sofort. Neue Notizen, in die du gar nichts geschrieben hast, räumt Mitschrift beim nächsten Start wieder weg, damit sich keine leeren Entwürfe ansammeln.'),

      h3('Die Kopfleiste einer Notiz'),
      p('Über jeder geöffneten Notiz liegt eine schmale Leiste:'),
      ul(
        [b('Menü-Symbol'), ' links – blendet die Seitenleiste ein oder aus.'],
        [b('Speicher-Punkt'), ' – zeigt, ob alles gespeichert ist. Fährst du mit der Maus darüber, steht dort „Gespeichert“, „Speichert …“ oder – falls etwas schiefgeht – „Nicht gespeichert – wird erneut versucht“.'],
        [b('Bearbeiten / Lernen'), ' in der Mitte – schaltet zwischen Schreiben und Üben um (siehe unten).'],
        [b('Zoom-Anzeige'), ' – erscheint nur, wenn du das Dokument vergrößert oder verkleinert hast. Ein Klick setzt auf 100 % zurück.'],
        [b('Präsentieren'), ' – zeigt die Notiz als Folien im Vollbild (', noteLink('praesentieren', 'Präsentieren'), ').'],
        [b('Blöcke & Format'), ' rechts – öffnet die Block-Leiste mit den Reitern Einfügen, Format und Info.'],
      ),

      h2('Bearbeiten und Lernen'),
      p('Jede Notiz hat zwei Modi. Im Modus ', b('Bearbeiten'), ' schreibst und gestaltest du. Im Modus ', b('Lernen'), ' ist die Notiz schreibgeschützt, und die Lernblöcke werden zu Übungen: Lücken werden zu Eingabefeldern, Karteikarten lassen sich umdrehen, Quiz auswerten und Aufklapp-Blöcke starten zugeklappt. Umschalten kannst du oben in der Mitte oder mit ', kbd('⌃⌘E'), ' (Bearbeiten) und ', kbd('⌃⌘L'), ' (Lernen). Alles dazu steht im Kapitel ', noteLink('lernmodus', 'Lernmodus'), '.'),

      h2('Alles finden mit ⌘K'),
      p('Die wichtigste Abkürzung überhaupt: ', kbd('⌘K'), ' öffnet in der Mitte des Fensters eine Suche, die fast alles kann. Sie findet:'),
      ul(
        [b('Notizen'), ' – nach Titel und Volltext, mit einem Textausschnitt rund um den Treffer.'],
        [b('Blöcke'), ' – zum direkten Einfügen in die offene Notiz.'],
        [b('Befehle & Einstellungen'), ' – jeden Menüpunkt, zum Beispiel „Dunkel“, „Präsentieren“ oder „Backup“.'],
        [b('Glossar-Begriffe'), ' und ', b('Handbuch-Seiten'), '.'],
      ),
      tip('Wenn du einen Befehl suchst, aber nicht weißt, in welchem Menü er steckt: einfach ', kbd('⌘K'), ' drücken und ein Stichwort tippen.'),

      h2('Mitschrift als App installieren'),
      p('Mitschrift läuft im Browser, lässt sich aber wie eine richtige App installieren – dann startet sie in einem eigenen Fenster und funktioniert auch ohne Internet. Unten in der Seitenleiste findest du dafür den Knopf ', b('App installieren'), '. In Safari erklärt dir Mitschrift dort, wie es geht: am Mac über „Ablage → Zum Dock hinzufügen“, auf iPhone und iPad über „Teilen → Zum Home-Bildschirm“. Firefox kann Web-Apps am Computer nicht installieren – nutze dafür Chrome, Edge oder Safari.'),
    ],
  }),
};

export default page;
