import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, caption, code, h2, h3, i, kbd, lead, math, note, noteLink, ol, p, quote, t, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'schreiben',
  title: 'Schreiben & Formatieren',
  parent: 'main',
  order: 20,
  section: 'Grundlagen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Schreiben in Mitschrift fühlt sich an wie in jedem Textprogramm: klicken, tippen, fertig. Dieses Kapitel zeigt dir, wie du Text gliederst und hervorhebst – per Maus, per Tastenkürzel oder mit Markdown-Abkürzungen direkt beim Tippen.'),

      h2('Absätze und Zeilen'),
      ul(
        [kbd('↵'), ' beginnt einen neuen Absatz.'],
        [kbd('⇧↵'), ' macht einen Zeilenumbruch innerhalb desselben Absatzes – praktisch für Adressen oder Gedichtzeilen.'],
        ['Mit ', kbd('⌘Z'), ' machst du jede Änderung rückgängig, mit ', kbd('⇧⌘Z'), ' stellst du sie wieder her.'],
      ),

      h2('Textstile: Überschriften und Absatzarten'),
      p('Jeder Absatz hat einen Stil. Damit gliederst du eine Notiz – und Inhaltsverzeichnis, Präsentationsmodus und Export orientieren sich daran.'),
      table(
        ['Stil', 'Wofür', 'Kürzel'],
        [b('Überschrift 1'), 'Große Abschnitte. Im Präsentationsmodus beginnt hier eine neue Folie.', kbd('⌥⌘1')],
        [b('Überschrift 2'), 'Unterabschnitte – ebenfalls eine neue Folie beim Präsentieren.', kbd('⌥⌘2')],
        [b('Überschrift 3'), 'Kleinere Zwischentitel innerhalb eines Abschnitts.', kbd('⌥⌘3')],
        [b('Text'), 'Normaler Fließtext.', kbd('⌥⌘0')],
        [b('Fett'), 'Ein ganzer Absatz etwas größer und fett – für kurze Merksätze.', '–'],
        [b('Beschriftung'), 'Klein und gedämpft, etwa unter einem Bild oder für Quellenangaben.', '–'],
      ),
      p('So sehen die beiden besonderen Absatzarten aus:'),
      lead('Die Zelle ist die kleinste Einheit des Lebens.'),
      caption('Abb. 1: Pflanzenzelle unter dem Lichtmikroskop, 400-fach vergrößert.'),
      p('Den Stil wechselst du über das Menü ', b('Format → Textstil'), ', im Reiter ', b('Format'), ' der Block-Leiste oder per Abkürzung beim Tippen (siehe unten).'),

      h2('Text hervorheben'),
      p('Markiere ein Wort oder einen Satz – direkt darüber erscheint die ', b('Formatleiste'), '. Dort findest du:'),
      table(
        ['Format', 'Beispiel', 'Kürzel'],
        [b('Fett'), t('wichtig', ['bold']), kbd('⌘B')],
        [b('Kursiv'), t('betont', ['italic']), kbd('⌘I')],
        [b('Unterstrichen'), t('unterstrichen', ['underline']), kbd('⌘U')],
        [b('Durchgestrichen'), t('veraltet', ['strike']), kbd('⇧⌘S')],
        [b('Inline-Code'), code('print("Hallo")'), kbd('⌘E')],
        [b('Taste'), [t('Strg', ['kbd']), ' + ', t('C', ['kbd'])], kbd('⇧⌘K')],
        [b('Tiefgestellt'), ['H', t('2', ['subscript']), 'O'], '–'],
        [b('Hochgestellt'), ['m', t('2', ['superscript'])], '–'],
        [b('Lücke'), 'Wird im Lernmodus zum Eingabefeld', kbd('⇧⌘L')],
      ),
      p('Außerdem sitzen in der Formatleiste die Knöpfe für ', b('Link'), ', ', b('Kommentieren'), ' (', noteLink('randnotizen', 'Randnotizen & Kommentare'), ') und ', b('Als Begriff ins Glossar'), ' (', noteLink('glossar', 'Glossar'), ').'),

      h3('Farbe und Ausrichtung'),
      p('Im Reiter ', b('Format'), ' der Block-Leiste (rechts, über ', b('Blöcke & Format'), ' in der Kopfleiste) kannst du markierten Text einfärben: Grau, Rot, Orange, Grün, Blau, Lila – oder über das Farbfeld eine ganz eigene Farbe. ', b('Standard'), ' entfernt die Farbe wieder.'),
      p('Absätze und Überschriften lassen sich linksbündig, zentriert (', kbd('⇧⌘E'), '), rechtsbündig (', kbd('⇧⌘R'), ') oder im Blocksatz (', kbd('⇧⌘J'), ') ausrichten – im Format-Reiter oder über ', b('Format → Ausrichtung'), '.'),
      p(b('Format → Formatierung entfernen'), ' setzt markierten Text auf schlichten Fließtext zurück.'),

      h2('Listen'),
      p('Mitschrift kennt drei Arten von Listen:'),
      ul(
        [b('Aufzählung'), ' mit Punkten (', kbd('⇧⌘8'), ').'],
        [b('Nummerierte Liste'), ' (', kbd('⇧⌘7'), ').'],
        [b('Aufgabenliste'), ' mit Kästchen zum Abhaken (', kbd('⇧⌘9'), ') – Aufgaben können sogar ein Fälligkeitsdatum bekommen, siehe ', noteLink('kalender', 'Kalender & Aufgaben'), '.'],
      ),
      p('Mit ', kbd('⇥'), ' rückst du einen Listenpunkt ein und machst ihn zum Unterpunkt, mit ', kbd('⇧⇥'), ' rückst du ihn wieder aus. Ein ', kbd('↵'), ' in einem leeren Listenpunkt beendet die Liste.'),

      h2('Zitate'),
      quote('Wer nichts weiß, muss alles glauben. – Marie von Ebner-Eschenbach'),
      p('Ein Zitat setzt du über ', b('Format → Textstil → Zitat'), ', über ', b('/'), ' oder indem du eine Zeile mit ', code('>'), ' und Leerzeichen beginnst.'),

      h2('Links'),
      ol(
        'Markiere den Text, der zum Link werden soll.',
        ['Klicke in der Formatleiste auf das Link-Symbol (oder ', b('Bearbeiten → Link hinzufügen …'), ').'],
        ['Füge die Adresse ein und bestätige mit ', kbd('↵'), '.'],
      ),
      p('Fährst du später mit der Maus über einen Link, zeigt Mitschrift eine kleine Vorschau mit Domain und Seitensymbol. Von dort kannst du ihn auch in eine ', b('Link-Zeile'), ' oder ein eingebettetes Bild, Video oder Audio umwandeln – mehr in ', noteLink('bloecke-medien', 'Bilder, Medien & Dateien'), '. Wie du auf andere Notizen verlinkst, steht in ', noteLink('verknuepfen', 'Verknüpfen & Graph'), '.'),

      h2('Schneller tippen mit Markdown'),
      p('Wenn du Markdown kennst, kannst du einfach lostippen: Mitschrift wandelt diese Zeichen sofort in die passende Formatierung um.'),
      table(
        ['Du tippst …', '… und bekommst'],
        [[code('#'), ' + Leerzeichen'], ['Überschrift 1 (', code('##'), ' für Überschrift 2, ', code('###'), ' für 3)']],
        [[code('-'), ' oder ', code('*'), ' + Leerzeichen'], 'Aufzählung'],
        [[code('1.'), ' + Leerzeichen'], 'Nummerierte Liste'],
        [[code('[ ]'), ' + Leerzeichen'], ['Aufgabenliste (', code('[x]'), ' für eine erledigte Aufgabe)']],
        [[code('>'), ' + Leerzeichen'], 'Zitat'],
        [[code('```'), ' + Leerzeichen'], 'Codeblock'],
        [code('---'), 'Trennlinie'],
        [[code('$$'), ' + Leerzeichen'], 'Formel-Block'],
        [code('$E=mc^2$'), ['Formel im Text: ', math('E=mc^2')]],
        [code('**fett**'), t('fett', ['bold'])],
        [code('*kursiv*'), t('kursiv', ['italic'])],
        [code('`code`'), code('code')],
        [code('~~weg~~'), t('weg', ['strike'])],
      ),

      h3('Markdown einfügen und kopieren'),
      p('Kopierst du Markdown-Text aus einem Chat, einem Editor oder einer ', code('.md'), '-Datei und fügst ihn mit ', kbd('⌘V'), ' ein, baut Mitschrift daraus echte Blöcke: Überschriften, Listen, Checklisten, Tabellen, Codeblöcke, Formeln (', code('$…$'), ', ', code('$$…$$'), '), Fußnoten (', code('[^1]'), ') und sogar Hinweis-Kästen im GitHub-Stil (', code('> [!NOTE]'), ', ', code('> [!TIP]'), ' …).'),
      p('Umgekehrt landet alles, was du in Mitschrift kopierst, zusätzlich als Markdown in der Zwischenablage. Fügst du es in einen reinen Texteditor ein, bekommst du sauberes Markdown; in Word oder einer E-Mail bleibt die Formatierung erhalten.'),
      tip('Text von Webseiten, aus Word oder anderen Notiz-Apps behält beim Einfügen seine Struktur – Überschriften, Listen und Fettdruck kommen also mit.'),
      note('Noch mehr Formate – Formeln, Fußnoten, Codeblöcke – erklärt das Kapitel ', noteLink('bloecke-formeln-code', 'Formeln, Code & Fußnoten'), '. ', i('Alle'), ' Kürzel auf einen Blick stehen unter ', noteLink('tastenkuerzel', 'Tastenkürzel'), '.'),
    ],
  }),
};

export default page;
