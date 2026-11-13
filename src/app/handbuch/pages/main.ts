/** Startseite des Handbuchs: bewusst kurz und einladend – die Tiefe steckt in den Kapiteln. */
import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, h2, kbd, p, pageLink, tip } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'main',
  title: 'Handbuch 📖',
  parent: null,
  order: 0,
  doc: () => ({
    type: 'doc',
    content: [
      p('Schön, dass du hier bist! Mitschrift ist ein ruhiger Ort für deine Notizen – zum Mitschreiben im Unterricht, zum Sortieren von Gedanken und vor allem zum Lernen. Dieses Handbuch erklärt dir Schritt für Schritt, was alles geht. Du musst nichts davon auswendig können: Lies einfach das Kapitel, das du gerade brauchst.'),

      h2('Du kannst nichts kaputt machen'),
      p('Alles, was du schreibst, wird automatisch gespeichert. Jede Änderung lässt sich mit ', kbd('⌘Z'), ' rückgängig machen, und gelöschte Notizen liegen noch 30 Tage im Papierkorb. Probier also ruhig alles aus.'),

      h2('Wo fange ich an?'),
      ...pageLink('erste-schritte', 'Erste Schritte', 'Die Oberfläche in fünf Minuten: Seitenleiste, Übersicht, deine erste Notiz und die beiden Modi.'),
      ...pageLink('schreiben', 'Schreiben & Formatieren', 'Überschriften, Listen, Fett & Co., Links und die Markdown-Abkürzungen, mit denen du schneller tippst.'),
      ...pageLink('bloecke', 'Mit Blöcken arbeiten', 'Alles, was über reinen Text hinausgeht – von Tabellen über Karteikarten bis zum Whiteboard.'),
      ...pageLink('lernmodus', 'Lernmodus', 'Aus deinen Notizen wird eine Übung: Lücken ausfüllen, Karten umdrehen, Quiz lösen.'),

      h2('Wenn du tiefer einsteigen willst'),
      p('In der Navigation links findest du alle Kapitel – vom Organisieren mit Tags und Unterseiten über Glossar, Kalender und Präsentationsmodus bis zu Export, Backup und allen Tastenkürzeln. Unten auf jeder Seite geht es mit ', b('Weiter'), ' zum nächsten Kapitel, falls du das Handbuch lieber von vorne bis hinten liest.'),

      tip(
        'Die Beispiele im Handbuch sind echt: Karteikarten lassen sich umdrehen, Quiz beantworten und Diagramme bewegen. Willst du ein Beispiel verändern oder als Vorlage nutzen? Oben rechts auf jeder Seite legt ',
        b('Als eigene Notiz öffnen'),
        ' eine bearbeitbare Kopie in deinen Notizen an.',
      ),
      p('Du findest das Handbuch jederzeit wieder in der Seitenleiste unter ', b('Mehr → Handbuch'), ', über die Suche mit ', kbd('⌘K'), ' oder direkt unter ', code('/handbuch'), '.'),
    ],
  }),
};

export default page;
