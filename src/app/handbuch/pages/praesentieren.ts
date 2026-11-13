import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'praesentieren',
  title: 'Präsentieren',
  parent: 'main',
  order: 100,
  section: 'Werkzeuge',
  doc: () => ({
    type: 'doc',
    content: [
      p('Jede Notiz ist auch eine Präsentation. Für ein Referat, eine Lerngruppe oder um am Beamer etwas zu erklären, musst du nichts in ein anderes Programm kopieren: Ein Klick, und Mitschrift zeigt deine Notiz als Folien im Vollbild.'),

      h2('Präsentation starten'),
      ul(
        ['Oben rechts in der Notiz auf das ', b('Präsentieren'), '-Symbol klicken – oder ', kbd('⌥⌘P'), '.'],
        [b('Ab aktueller Stelle präsentieren'), ' (', kbd('⇧⌥⌘P'), ', im Menü Darstellung) beginnt mit der Folie, auf der dein Cursor gerade steht – praktisch, um nach einer Pause weiterzumachen.'],
      ),

      h2('Wie aus einer Notiz Folien werden'),
      p('Mitschrift teilt die Notiz automatisch auf:'),
      ol(
        ['Zuerst kommt eine ', b('Titelfolie'), ' mit dem Titel der Notiz und ihren Tags.'],
        ['Jede ', b('Überschrift 1'), ' und jede ', b('Überschrift 2'), ' beginnt eine neue Folie.'],
        ['Ein ', b('Seitenumbruch'), ' beginnt ebenfalls eine neue Folie – so trennst du Folien auch ohne Überschrift.'],
      ),
      p('Folien mit viel Inhalt verkleinert Mitschrift automatisch, damit alles auf den Bildschirm passt. Überschrift 3 eignet sich deshalb gut als Zwischentitel innerhalb einer Folie.'),
      tip('Plane die Notiz wie eine Präsentation: eine Überschrift 2 pro Folie, darunter wenige Stichpunkte und ein Bild oder Diagramm. Das liest sich auch als Notiz gut.'),

      h2('Steuerung'),
      table(
        ['Taste', 'Aktion'],
        [[kbd('→'), ', ', kbd('↓'), ', ', kbd('Leertaste'), ', ', kbd('↵')], 'Weiter'],
        [[kbd('←'), ', ', kbd('↑'), ', ', kbd('⌫')], 'Zurück'],
        [[kbd('Pos1'), ' / ', kbd('Ende')], 'Erste / letzte Folie'],
        [kbd('O'), 'Übersicht aller Folien (auch ', kbd('G'), ') – ein Klick springt zur Folie'],
        [kbd('S'), 'Schrittweise einblenden an/aus'],
        [kbd('L'), 'Laserpointer an/aus'],
        [[kbd('B'), ' oder ', kbd('.')], 'Bildschirm schwarz schalten – und wieder zurück'],
        [kbd('F'), 'Vollbild an/aus'],
        [kbd('Esc'), 'Übersicht oder Schwarzbild schließen, sonst Präsentation beenden'],
      ),
      p('Dieselben Funktionen findest du in der Leiste am unteren Rand. Sie blendet sich aus, wenn du die Maus eine Weile nicht bewegst, und erscheint wieder, sobald du sie bewegst. Dort läuft auch eine Uhr mit, die zeigt, wie lange du schon präsentierst.'),

      h3('Schrittweise einblenden'),
      p('Ist ', b('Schrittweise'), ' eingeschaltet, erscheint auf einer Folie zuerst nur die Überschrift. Jeder weitere Druck auf ', kbd('→'), ' blendet den nächsten Block ein – so kannst du Punkt für Punkt erzählen, ohne dass das Publikum schon vorausliest.'),
      h3('Laserpointer'),
      p('Mit ', kbd('L'), ' wird der Mauszeiger zu einem leuchtenden roten Punkt, mit dem du auf Details zeigen kannst.'),

      h2('Interaktiv präsentieren'),
      p('Karteikarten, Quiz, Lückentexte, der Funktionsplotter, der Zeitstrahl und Galerien funktionieren auch in der Präsentation – wie im ', noteLink('lernmodus', 'Lernmodus'), '. Du kannst also live ein Quiz mit der Klasse lösen oder am Plotter zeigen, was ein Parameter bewirkt.'),
      note('Randnotizen und Kommentare erscheinen nicht in der Präsentation – du kannst sie also gefahrlos als Sprechzettel nutzen.'),
    ],
  }),
};

export default page;
