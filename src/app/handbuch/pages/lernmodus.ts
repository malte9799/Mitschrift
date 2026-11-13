import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, cloze, h2, h3, kbd, note, noteLink, ol, p, table, tip, toggle, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'lernmodus',
  title: 'Lernmodus',
  parent: 'main',
  order: 40,
  section: 'Grundlagen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Notizen schreibt man meistens, um sich später an etwas zu erinnern. Der Lernmodus hilft genau dabei: Er macht aus einer fertigen Notiz eine Übung, mit der du dich selbst abfragst – statt den Text nur noch einmal durchzulesen.'),

      h2('Umschalten'),
      p('Oben in der Mitte jeder Notiz sitzt der Schalter ', b('Bearbeiten | Lernen'), '. Alternativ:'),
      ul(
        [kbd('⌃⌘L'), ' – in den Lernmodus wechseln.'],
        [kbd('⌃⌘E'), ' – zurück zum Bearbeiten.'],
        [b('Darstellung → Lernmodus'), ' bzw. ', b('Bearbeitungsmodus'), ' in der Menüleiste.'],
      ),
      p('Jede Notiz öffnet sich zunächst im Bearbeiten-Modus. Im Lernmodus erinnert dich ein schmaler Hinweis unter dem Titel daran, wo du bist.'),

      h2('Was sich im Lernmodus ändert'),
      p('Die Notiz ist jetzt schreibgeschützt – du kannst also nichts versehentlich verändern. Titel, Tags und die Block-Leiste sind gesperrt bzw. ausgeblendet. Dafür werden diese Blöcke lebendig:'),
      table(
        ['Block', 'Im Bearbeiten-Modus', 'Im Lernmodus'],
        [b('Lücke'), 'Hervorgehobenes Wort', 'Eingabefeld mit Prüfung und „Lösung zeigen“'],
        [b('Karteikarten'), 'Liste von Vorder- und Rückseiten', 'Gemischter Stapel zum Umdrehen, mit „Gewusst“ und „Nochmal“'],
        [b('Quiz'), 'Fragen und Antworten zum Bearbeiten', 'Fragen nacheinander, mit Rückmeldung, Erklärung und Auswertung'],
        [b('Toggle-Liste'), 'Aufgeklappt, wie du sie verlassen hast', 'Startet immer zugeklappt'],
        [b('Zeitstrahl'), 'Daten bearbeiten', 'Mit „Daten verdecken“ Jahreszahlen selbst abfragen'],
      ),
      p('Alle anderen Blöcke – Diagramme, Plotter, Tabellen, Bilder – bleiben bedienbar: Du kannst im Plotter weiter an Reglern ziehen, Galerien durchblättern und Bilder in der Großansicht öffnen.'),

      h2('Probier es hier aus'),
      p('Dieses Handbuch zeigt alles wie im Lernmodus. Fülle die Lücken aus und drücke ', kbd('↵'), ':'),
      p('Das Herz pumpt sauerstoffreiches Blut über die ', cloze('Aorta'), ' in den Körper. Sauerstoffarmes Blut gelangt über die ', cloze('Hohlvene'), ' zurück in den ', cloze('rechten'), ' Vorhof.'),
      toggle('Welche Herzkammer hat die dickere Wand – und warum?', p('Die linke. Sie muss das Blut durch den ganzen Körperkreislauf pumpen und dabei einen viel höheren Druck aufbauen als die rechte Kammer, die nur den Lungenkreislauf versorgt.')),

      h2('So lernst du mit Mitschrift'),
      p('Ein Vorschlag, wie du aus einer Mitschrift eine Lernnotiz machst:'),
      ol(
        [b('Mitschreiben'), ' – im Unterricht einfach tippen, ohne an das Lernen zu denken.'],
        [b('Aufbereiten'), ' – zu Hause die wichtigsten Begriffe als Lücken markieren (', kbd('⇧⌘L'), '), Fragen in Toggle-Listen packen und Fachbegriffe als Karteikarten sammeln.'],
        [b('Abfragen'), ' – in den Lernmodus wechseln und versuchen, alles aus dem Kopf zu beantworten, bevor du nachschaust.'],
        [b('Wiederholen'), ' – nach ein paar Tagen erneut abfragen. Was sitzt, kannst du seltener wiederholen; was nicht sitzt, öfter.'],
      ),
      tip('Die Vorlage ', b('Klausur-Vorbereitung'), ' bringt eine Sammlung mit, in der du für jedes Thema den Status („Offen“, „Lerne ich gerade“, „Sitzt“) und ein Datum „Wiederholen am“ festhältst – samt Board- und Kalender-Ansicht. Du findest sie über den Pfeil neben ', b('Neue Notiz'), ' (', noteLink('organisieren', 'Notizen organisieren'), ').'),

      h3('Lernen mit dem Glossar'),
      p('Auch dein ', noteLink('glossar', 'Glossar'), ' hat eine Abfrage: Mitschrift zeigt dir eine Abkürzung, und du überlegst, wofür sie steht – oder umgekehrt.'),
      h3('Lernen vor Publikum'),
      p('Im ', noteLink('praesentieren', 'Präsentationsmodus'), ' funktionieren Karteikarten, Quiz und Plotter ebenfalls. So kannst du eine Notiz als Referat oder als Quiz für die Lerngruppe zeigen.'),
      note('Der Lernmodus speichert keinen Lernstand: Wenn du die Notiz neu öffnest, beginnen Lücken, Karten und Quiz wieder von vorn.'),
    ],
  }),
};

export default page;
