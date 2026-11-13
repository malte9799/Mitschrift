import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, caution, code, h2, h3, hr, important, kbd, note, noteLink, ol, p, tasks, tip, toggle, ul, warning } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-text',
  title: 'Text, Listen & Hervorheben',
  parent: 'bloecke',
  order: 31,
  doc: () => ({
    type: 'doc',
    content: [
      p('Die Grundbausteine jeder Notiz. Überschriften, Absatzarten und Inline-Formatierung erklärt das Kapitel ', noteLink('schreiben', 'Schreiben & Formatieren'), ' – hier geht es um Listen, Aufgaben, Aufklapp-Blöcke, Hinweis-Kästen und Trennlinien.'),

      h2('Aufzählung und nummerierte Liste'),
      p('Für Stichpunkte und Reihenfolgen. Einfügen über ', b('/liste'), ', mit ', code('-'), ' bzw. ', code('1.'), ' am Zeilenanfang oder mit ', kbd('⇧⌘8'), ' / ', kbd('⇧⌘7'), '.'),
      ul('Zellkern – enthält die Erbinformation', ['Mitochondrien – „Kraftwerke“ der Zelle']),
      ol('Probe vorbereiten', 'Unter dem Mikroskop scharf stellen', 'Beobachtung skizzieren'),
      p('Unterpunkte entstehen mit ', kbd('⇥'), '; ', kbd('⇧⇥'), ' holt sie zurück. Mehrere Punkte auf einmal rückst du ein, indem du sie markierst und dann ', kbd('⇥'), ' drückst.'),

      h2('Aufgabenliste'),
      p('Eine Checkliste zum Abhaken – über ', b('/aufgaben'), ', ', code('[ ]'), ' + Leerzeichen oder ', kbd('⇧⌘9'), '. Ein Klick auf das Kästchen hakt die Aufgabe ab.'),
      tasks([true, 'Arbeitsblatt Zellaufbau ausfüllen'], [false, 'Referat-Folien fertig machen'], [false, 'Vokabeln Unit 4 wiederholen']),
      h3('Aufgaben mit Fälligkeitsdatum'),
      p('Jede Aufgabe kann ein Datum (und optional eine Uhrzeit) bekommen. Klicke dazu auf das kleine Feld ', b('Fällig …'), ' hinter der Aufgabe und wähle Tag und – wenn du magst – Uhrzeit. Sobald ein Datum gesetzt ist, legt Mitschrift automatisch einen passenden Termin im ', noteLink('kalender', 'Kalender'), ' an. Hakst du die Aufgabe ab, wird auch der Termin als erledigt markiert; löschst du das Datum, verschwindet der Termin wieder.'),
      tip('Eine Aufgabenzeile mit Datum eignet sich auch ohne Häkchen gut als Merker – „Klausur Bio, Freitag“ steht dann gleichzeitig in der Notiz und im Kalender.'),

      h2('Toggle-Liste (Aufklappen)'),
      p('Eine Zeile mit Titel, unter der sich weiterer Inhalt versteckt. Ein Klick auf den Pfeil klappt sie auf und zu. Ideal für Fragen mit Lösung, lange Herleitungen oder Zusatzinfos, die nicht immer sichtbar sein müssen. Einfügen über ', b('/toggle'), ' oder ', b('/aufklappen'), '.'),
      toggle('Warum ist der Himmel blau?', p('Kurzwelliges blaues Licht wird an den Molekülen der Luft viel stärker gestreut als langwelliges rotes Licht (Rayleigh-Streuung). Deshalb kommt aus allen Richtungen des Himmels vor allem blaues Licht bei uns an.')),
      toggle('Was ist die Hauptstadt von Australien?', p('Canberra – nicht Sydney.')),
      p('Im Inneren eines Toggles darf alles stehen, was auch sonst in einer Notiz steht: Listen, Bilder, sogar weitere Toggles. Im ', noteLink('lernmodus', 'Lernmodus'), ' starten alle Toggles zugeklappt – perfekt zum Selbst-Abfragen.'),

      h2('Hinweis-Kästen (Callouts)'),
      p('Farbige Kästen, die etwas aus dem Fließtext herausheben. Es gibt fünf Vorlagen – wie bei GitHub:'),
      note('Hinweis – neutrale Zusatzinformation, die man kennen sollte.'),
      tip('Tipp – ein nützlicher Kniff oder eine Abkürzung.'),
      important('Wichtig – das muss man sich unbedingt merken.'),
      warning('Warnung – hier ist Vorsicht geboten.'),
      caution('Vorsicht – ein häufiger Fehler oder ein echtes Risiko.'),
      p('Einfügen über ', b('/hinweis'), ', ', b('/tipp'), ', ', b('/wichtig'), ', ', b('/warnung'), ' oder ', b('/vorsicht'), '. Über ', b('Stil'), ' in der Optionsleiste passt du jeden Kasten an:'),
      ul(
        [b('Darstellung'), ' – als Strich am linken Rand (Standard) oder als farbige Fläche hinter dem ganzen Block.'],
        [b('Titel'), ' – statt „Hinweis“ zum Beispiel „Merke“ oder „Definition“.'],
        [b('Symbol und Farbe'), ' – frei wählbar, auch die Tag-Farben stehen zur Verfügung.'],
      ),
      p('Ein Kasten kann mehrere Absätze, Listen und andere Blöcke enthalten. Beim Einfügen von Markdown erkennt Mitschrift die GitHub-Schreibweise ', code('> [!NOTE]'), ', ', code('> [!TIP]'), ', ', code('> [!IMPORTANT]'), ', ', code('> [!WARNING]'), ' und ', code('> [!CAUTION]'), '.'),

      h2('Zitat'),
      p('Für wörtliche Aussagen oder Quelltexte. Einfügen mit ', code('>'), ' + Leerzeichen oder über ', b('/zitat'), '. Ein Zitat ist schlichter als ein Hinweis-Kasten: nur ein Strich am Rand, ohne Titel und Symbol.'),

      h2('Trennlinien'),
      p('Trennlinien gliedern eine Notiz optisch. Es gibt vier Stärken – den Stil kannst du später in der Optionsleiste wechseln:'),
      p(b('Extra dünn'), ' (drei Punkte):'),
      hr('dots'),
      p(b('Dünn'), ' (gepunktet):'),
      hr('dotted'),
      p(b('Regulär'), ':'),
      hr('regular'),
      p(b('Fett'), ':'),
      hr('bold'),
      p('Schnell geht es mit ', code('---'), ' am Zeilenanfang.'),
      h3('Seitenumbruch'),
      p('Die fünfte Variante ist der ', b('Seitenumbruch'), '. Er teilt die Notiz in Seiten für Druck und PDF-Export: Sobald eine Notiz mindestens einen Seitenumbruch enthält, zeigt Mitschrift jede Seite als eigene Karte, damit du schon beim Schreiben siehst, was auf einem Blatt landet. Im Präsentationsmodus beginnt an einem Seitenumbruch außerdem eine neue Folie.'),
    ],
  }),
};

export default page;
