import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, codeBlock, h2, h3, kbd, note, noteLink, ol, p, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'glossar',
  title: 'Glossar',
  parent: 'main',
  order: 80,
  section: 'Werkzeuge',
  doc: () => ({
    type: 'doc',
    content: [
      p('In vielen Fächern wimmelt es von Fachbegriffen und Abkürzungen: DNS, ATP, BIP, DNA … Das Glossar ist deine persönliche Liste dieser Begriffe – mit Langform und Erklärung. Das Besondere: Du pflegst jeden Begriff nur einmal, und Mitschrift erkennt ihn danach in ', b('allen'), ' deinen Notizen automatisch.'),

      h2('Was das Glossar für dich tut'),
      ul(
        ['Jeder Begriff aus dem Glossar wird in deinen Notizen dezent ', b('unterstrichen'), '. Fährst du mit der Maus darüber, erscheinen Langform und Erklärung – ohne dass du ihn irgendwo verlinken musst.'],
        ['Der Block ', b('Abkürzungsverzeichnis'), ' listet alle Begriffe, die in einer Notiz vorkommen, und hält sich selbst aktuell (', noteLink('bloecke-formeln-code', 'Formeln, Code & Fußnoten'), ').'],
        ['Mit ', b('Abfragen'), ' lernst du die Begriffe wie mit Karteikarten.'],
      ),
      p('Abkürzungen (mindestens zwei Großbuchstaben wie DNS oder IPv4) erkennt Mitschrift genau in dieser Schreibweise, auch mit Plural-s („APIs“). Normale Wörter werden unabhängig von Groß- und Kleinschreibung erkannt. Bei überlappenden Begriffen gewinnt der längere – „TCP/IP“ vor „TCP“.'),
      tip('Die Unterstreichung stört dich gerade? ', b('Darstellung → Begriffe hervorheben'), ' schaltet sie aus und wieder ein.'),

      h2('Das Glossar öffnen'),
      p('Seitenleiste → ', b('Mehr → Glossar'), ', ', kbd('⌃⌘B'), ' oder über ', kbd('⌘K'), '. Oben siehst du, wie viele Begriffe du gesammelt hast, darunter die Liste – alphabetisch, mit einer A–Z-Leiste zum Springen. Das Suchfeld durchsucht Begriffe, Langformen und Erklärungen; mit den Tags filterst du zum Beispiel nach Fach.'),

      h2('Begriffe hinzufügen'),
      h3('Direkt aus einer Notiz – der schnellste Weg'),
      ol(
        ['Markiere in einer Notiz eine Stelle wie ', b('Domain Name System (DNS)'), '.'],
        ['Klicke in der Formatleiste auf ', b('Als Begriff ins Glossar'), ' oder drücke ', kbd('⇧⌘G'), '.'],
        'Mitschrift erkennt selbst, was Abkürzung und was Langform ist, und füllt den Dialog vor. Ergänze bei Bedarf eine Erklärung und Tags, dann speichern.',
      ),
      p('Das klappt mit vielen Schreibweisen: „Domain Name System (DNS)“, „DNS (Domain Name System)“, „DNS – Domain Name System“ oder „DNS: Domain Name System“.'),
      h3('Von Hand'),
      p('Im Glossar über ', b('Begriff'), '. Der Dialog hat die Felder ', b('Begriff oder Abkürzung'), ', ', b('Ausgeschrieben'), ', ', b('Erklärung'), ' (optional) und ', b('Tags'), '.'),
      h3('Eine ganze Liste importieren'),
      p('Du hast schon eine Liste – vom Arbeitsblatt, aus einer Tabelle oder einem anderen Programm? Klicke auf ', b('Importieren'), ' und füge sie ein. Eine Zeile pro Begriff, zum Beispiel:'),
      codeBlock('plaintext', 'DNS – Domain Name System\nTCP: Transmission Control Protocol\nVLAN; Virtual Local Area Network; Logisch getrenntes Netz im selben Switch'),
      p('Erlaubt sind Bindestrich, Doppelpunkt oder Gleichheitszeichen als Trenner, Semikolon- oder Tab-getrennte Spalten (Begriff; Langform; Erklärung), die Schreibweise ', code('Domain Name System (DNS)'), ' und sogar Markdown-Tabellen.'),
      h3('Vorschläge'),
      p('Unter ', b('Vorschläge'), ' durchsucht Mitschrift deine Notizen nach Abkürzungen, die dort schon mit Langform stehen – etwa „Bruttoinlandsprodukt (BIP)“ –, aber noch nicht im Glossar sind. Mit einem Klick übernimmst du sie, Unpassendes ignorierst du. Die Zahl am Knopf zeigt, wie viele Vorschläge warten.'),

      h2('Begriffe abfragen'),
      p(b('Abfragen'), ' startet eine Abfrage wie mit Karteikarten – über alle Begriffe, die gerade in der Liste stehen. Willst du nur ein Fach üben, filtere also vorher nach dem passenden Tag. Du wählst die Richtung:'),
      ul(
        [b('Abkürzung → Langform'), ' – „DNS“ wird gezeigt, du überlegst „Domain Name System“.'],
        [b('Langform → Abkürzung'), ' – umgekehrt.'],
      ),
      p('Klick oder ', kbd('Leertaste'), ' deckt die Antwort auf. Danach sortierst du mit ', b('Gewusst'), ' (', kbd('→'), ') oder ', b('Nochmal'), ' (', kbd('←'), '). ', kbd('Esc'), ' beendet die Abfrage.'),
      note('Das Glossar ist etwas anderes als der Abkürzungsverzeichnis-Block: Das Glossar ist die zentrale Liste aller Begriffe, das Verzeichnis zeigt nur einen Ausschnitt daraus in einer bestimmten Notiz.'),
    ],
  }),
};

export default page;
