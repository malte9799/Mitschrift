import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, codeBlock, footnote, h2, h3, kbd, math, mathBlock, note, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-formeln-code',
  title: 'Formeln, Code & Fußnoten',
  parent: 'bloecke',
  order: 36,
  doc: () => ({
    type: 'doc',
    content: [
      p('Werkzeuge für Mathe, Naturwissenschaften, Informatik und alle, die sauber zitieren wollen.'),

      h2('Formeln'),
      p('Mitschrift setzt mathematische Formeln so, wie man sie aus Büchern kennt – vom einfachen Bruch bis zum Integral. Es gibt zwei Arten:'),
      ul(
        [b('Formel im Text'), ' – steht mitten im Satz, z. B. der Satz des Pythagoras ', math('a^2 + b^2 = c^2'), ' oder die Lösungsformel ', math('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'), '.'],
        [b('Formel-Block'), ' – eine eigene, zentrierte Zeile für größere Formeln:'],
      ),
      mathBlock('\\int_0^1 x^2 \\, dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}'),
      h3('Formeln eingeben'),
      table(
        ['Weg', 'Ergebnis'],
        [[kbd('⇧⌘M'), ' oder ', b('/formel')], 'Neue Formel im Text, der Formel-Editor öffnet sich sofort'],
        [[code('$a^2$'), ' tippen'], ['Wird beim schließenden ', code('$'), ' zur Formel im Text']],
        [[code('$$'), ' + Leerzeichen'], 'Neuer Formel-Block'],
      ),
      p('Der ', b('Formel-Editor'), ' zeigt die Formel schon während des Tippens gesetzt an. Knöpfe fügen Bruch, Wurzel, Hoch- und Tiefzahl, Summe, Integral und griechische Buchstaben an der Schreibmarke ein; mit den Pfeiltasten wanderst du durch die Formel. Wer LaTeX kennt, kann sich daneben auch den Quelltext anzeigen lassen und direkt dort schreiben. Ein Klick auf eine bestehende Formel öffnet den Editor wieder.'),
      tip('Ein paar LaTeX-Bausteine zum Merken: ', code('\\frac{a}{b}'), ' für Brüche, ', code('\\sqrt{x}'), ' für Wurzeln, ', code('x^{2}'), ' und ', code('x_{1}'), ' für Hoch- und Tiefzahlen, ', code('\\alpha'), ', ', code('\\beta'), ', ', code('\\pi'), ' für griechische Buchstaben, ', code('\\cdot'), ' für den Malpunkt.'),

      h2('Codeblock'),
      p('Für Programmcode, Konfigurationen oder Terminal-Befehle. Einfügen über ', b('/code'), ' oder mit ', code('```'), ' + Leerzeichen.'),
      codeBlock('python', 'def ggt(a, b):\n    """Größter gemeinsamer Teiler nach Euklid."""\n    while b:\n        a, b = b, a % b\n    return a\n\nprint(ggt(48, 18))  # 6'),
      ul(
        [b('Syntax-Hervorhebung'), ' für über 30 Sprachen – von Python, Java, JavaScript und C++ über HTML, CSS und SQL bis zu Bash, JSON und Markdown. Die Sprache wählst du in der Optionsleiste; „Automatisch“ erkennt sie selbst.'],
        [b('Zeilennummern'), ' und ein ', b('Kopieren'), '-Knopf, der den ganzen Code in die Zwischenablage legt.'],
        ['Mit ', kbd('⇥'), ' rückst du ein, mit ', kbd('⇧⇥'), ' aus – auch mehrere markierte Zeilen auf einmal.'],
      ),
      h3('Der Vollbild-Editor'),
      p('Ein Doppelklick auf einen Codeblock (oder ', b('Vollbild'), ' in der Optionsleiste) öffnet einen großen Code-Editor, wie man ihn vom Programmieren kennt:'),
      ul(
        ['Links steht ein ', b('Dateibaum'), ': Jeder Codeblock der Notiz ist darin eine Datei.'],
        ['Benenne eine Datei im Dateibaum um, etwa in ', code('main.py'), ' – die Endung bestimmt automatisch die Sprache, und der Name erscheint auch oben am Codeblock in der Notiz. Ein ', code('/'), ' im Namen legt Ordner an, etwa ', code('src/main.py'), '.'],
        ['Über die Knöpfe im Dateibaum legst du neue Dateien an, benennst Dateien und Ordner um oder löschst sie.'],
        ['Nach ', code(':'), ' oder ', code('{'), ' rückt ', kbd('↵'), ' die nächste Zeile automatisch ein.'],
        [kbd('Esc'), ' schließt den Editor; alles steht dann wieder in der Notiz.'],
      ),
      note('Wie der Code aussieht, stellst du unter ', b('Darstellung → Code-Theme'), ' ein – von GitHub Light über Dracula bis Tokyo Night. „Automatisch“ passt sich dem hellen bzw. dunklen Farbschema an (', noteLink('anpassen', 'Darstellung anpassen'), ').'),

      h2('Fußnoten'),
      p('Fußnoten halten den Text lesbar und die Quellen trotzdem griffbereit. Im Text steht nur eine kleine, automatisch durchnummerierte Zahl', footnote('So sieht eine Fußnote aus – hier stehen Quelle, Zitat oder Anmerkung.'), ' – den Inhalt siehst du beim Darüberfahren, und unter der Notiz stehen alle Fußnoten gesammelt.'),
      ol(
        'Setze den Cursor an die Stelle, an die die Fußnote gehört.',
        ['Tippe ', b('/fußnote'), ' oder klicke im Format-Reiter auf ', b('Fußnote'), '.'],
        ['Schreib den Text der Fußnote und bestätige mit ', kbd('↵'), '.'],
      ),
      p('Ein Klick auf die Nummer öffnet die Fußnote wieder zum Bearbeiten. Leerst du ihren Text, verschwindet sie. Ein Klick auf eine Fußnote in der Liste unter der Notiz springt zur passenden Stelle im Text. Beim Einfügen von Markdown erkennt Mitschrift die Schreibweise ', code('Text[^1]'), ' … ', code('[^1]: Quelle'), '.'),

      h2('Abkürzungsverzeichnis'),
      p('Der Block ', b('Abkürzungsverzeichnis'), ' listet automatisch alle Fachbegriffe und Abkürzungen aus deinem ', noteLink('glossar', 'Glossar'), ', die in dieser Notiz vorkommen – alphabetisch und mit Langform. Du musst nichts von Hand pflegen: Kommt ein neuer Begriff in den Text, steht er sofort im Verzeichnis. In der Optionsleiste schaltest du um zwischen ', b('Diese Notiz'), ' und ', b('Alle'), ' (das komplette Glossar).'),
      { type: 'glossaryList', attrs: { title: 'Abkürzungsverzeichnis', scope: 'all' } },
    ],
  }),
};

export default page;
