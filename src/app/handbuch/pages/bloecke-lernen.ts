import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, cloze, h2, h3, kbd, note, noteLink, ol, p, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-lernen',
  title: 'Lernblöcke',
  parent: 'bloecke',
  order: 32,
  doc: () => ({
    type: 'doc',
    content: [
      p('Lückentext, Karteikarten und Quiz verwandeln deine Notizen in Übungen. Im Modus ', b('Bearbeiten'), ' legst du sie an, im Modus ', b('Lernen'), ' benutzt du sie. Wie der Lernmodus insgesamt funktioniert, erklärt das Kapitel ', noteLink('lernmodus', 'Lernmodus'), '.'),
      note('Dieses Handbuch zeigt alle Blöcke so, wie sie im Lernmodus aussehen – du kannst die Beispiele unten also direkt ausprobieren.'),

      h2('Lückentext'),
      p('Ein Lückentext ist kein eigener Block, sondern eine Markierung im normalen Text: Du schreibst ganz normal und machst einzelne Wörter zu Lücken.'),
      h3('Lücke anlegen'),
      ol(
        'Markiere das Wort oder die Wortgruppe, die später abgefragt werden soll.',
        ['Klicke in der Formatleiste auf das Lücken-Symbol – oder drücke ', kbd('⇧⌘L'), '.'],
        'Das Wort erscheint jetzt hervorgehoben. Fertig!',
      ),
      p('Im Lernmodus wird jede Lücke zum Eingabefeld. Tippe deine Antwort und drücke ', kbd('↵'), ': Mitschrift zeigt sofort, ob sie stimmt. Groß- und Kleinschreibung sowie überzählige Leerzeichen spielen dabei keine Rolle. Kommst du nicht drauf, deckt ', b('Lösung zeigen'), ' die richtige Antwort auf.'),
      p('Probier es aus: Die Mitochondrien sind das ', cloze('Kraftwerk'), ' der Zelle. Die Fotosynthese findet in den ', cloze('Chloroplasten'), ' statt, genauer gesagt in der ', cloze('Thylakoidmembran'), '.'),
      tip('Mach nur die Begriffe zur Lücke, auf die es wirklich ankommt. Ein Satz mit einer gut gewählten Lücke trainiert mehr als ein Satz, in dem jedes zweite Wort fehlt.'),

      h2('Karteikarten'),
      p('Ein Stapel Karten mit Vorder- und Rückseite – für Vokabeln, Fachbegriffe, Definitionen oder Jahreszahlen. Einfügen über ', b('/karteikarten'), ' oder ', b('/vokabeln'), '.'),
      h3('Im Bearbeiten-Modus'),
      ul(
        ['Jede Karte hat zwei Felder: ', b('Vorderseite'), ' (Begriff oder Frage) und ', b('Rückseite'), ' (Antwort).'],
        ['Neue Karten fügst du mit ', b('Karte'), ' in der Optionsleiste oder mit dem Knopf unter den Karten hinzu.'],
        'Das kleine × neben einer Karte entfernt sie.',
      ),
      h3('Im Lernmodus'),
      ul(
        'Die Karten werden gemischt und einzeln gezeigt. Ein Klick dreht die Karte um.',
        [b('Gewusst'), ' legt die Karte beiseite, ', b('Nochmal'), ' schiebt sie zurück in den Stapel – sie kommt also wieder, bis du sie kannst.'],
        ['Ein Fortschrittsbalken zeigt, wie viele Karten du schon gewusst hast. Am Ende kannst du mit ', b('Neu mischen'), ' von vorne beginnen.'],
      ),
      {
        type: 'flashcards',
        attrs: {
          cards: [
            { front: 'Fotosynthese', back: 'Umwandlung von Lichtenergie in chemische Energie: Aus CO₂ und Wasser entstehen Glucose und Sauerstoff.' },
            { front: 'Osmose', back: 'Diffusion von Wasser durch eine halbdurchlässige (semipermeable) Membran.' },
            { front: 'Enzym', back: 'Protein, das als Biokatalysator eine bestimmte Reaktion beschleunigt.' },
            { front: 'Mitose', back: 'Kernteilung, bei der zwei erbgleiche Tochterzellen entstehen.' },
          ],
        },
      },

      h2('Quiz'),
      p('Multiple-Choice-Fragen mit Auswertung. Einfügen über ', b('/quiz'), '.'),
      h3('Im Bearbeiten-Modus'),
      ul(
        'Schreib die Frage und darunter die Antwortmöglichkeiten.',
        'Klicke auf den Kreis vor der richtigen Antwort, um sie als korrekt zu markieren.',
        ['Unter jeder Frage kannst du eine ', b('Erklärung'), ' ergänzen. Sie erscheint nach dem Antworten – egal ob richtig oder falsch – und ist oft der wertvollste Teil.'],
        ['Mit ', b('Frage'), ' in der Optionsleiste fügst du weitere Fragen hinzu.'],
      ),
      h3('Im Lernmodus'),
      p('Die Fragen kommen nacheinander. Nach jeder Antwort siehst du „Richtig!“ oder „Leider falsch.“ samt Erklärung, mit ', b('Weiter'), ' geht es zur nächsten Frage. Am Ende gibt es eine Auswertung, wie viele du richtig hattest.'),
      {
        type: 'quiz',
        attrs: {
          questions: [
            {
              question: 'Welches Organell enthält den größten Teil der DNA einer Eukaryotenzelle?',
              options: ['Ribosom', 'Zellkern', 'Golgi-Apparat', 'Lysosom'],
              correct: 1,
              why: 'Die DNA liegt im Zellkern. Ein kleiner Teil steckt außerdem in Mitochondrien und Chloroplasten.',
            },
            {
              question: 'Was entsteht bei der Fotosynthese neben Glucose?',
              options: ['Kohlenstoffdioxid', 'Stickstoff', 'Sauerstoff'],
              correct: 2,
              why: 'Bei der Fotosynthese wird Wasser gespalten – dabei wird Sauerstoff frei.',
            },
          ],
        },
      },

      h2('Und was ist mit Toggles und Zeitstrahl?'),
      p('Auch zwei andere Blöcke helfen beim Lernen: ', b('Toggle-Listen'), ' starten im Lernmodus zugeklappt – schreib eine Frage in den Titel und die Antwort hinein (', noteLink('bloecke-text', 'Text, Listen & Hervorheben'), '). Und beim ', b('Zeitstrahl'), ' kannst du die Jahreszahlen verdecken und dich selbst abfragen (', noteLink('bloecke-diagramme', 'Diagramme & Zeitstrahl'), ').'),
    ],
  }),
};

export default page;
