import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, h2, h3, kbd, note, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'verknuepfen',
  title: 'Verknüpfen & Graph',
  parent: 'main',
  order: 60,
  section: 'Ordnung halten',
  doc: () => ({
    type: 'doc',
    content: [
      p('Wissen hängt zusammen: Die Fotosynthese hat mit der Zelle zu tun, die Zelle mit der Genetik. In Mitschrift kannst du Notizen deshalb miteinander verlinken – und siehst im Graphen auf einen Blick, wie dein Wissen vernetzt ist.'),
      note('Das hier gilt für deine eigenen Notizen. Dieses Handbuch ist technisch keine Notiz und taucht deshalb weder in der Notizliste noch in der Suche oder im Graphen auf.'),

      h2('Eine Notiz verlinken'),
      ol(
        ['Tippe im Text ', code('[['), ' (zwei eckige Klammern). Es öffnet sich ', b('Notiz verlinken'), '.'],
        'Tippe ein paar Buchstaben des Titels – die Liste filtert sich sofort.',
        ['Wähle die Notiz mit den Pfeiltasten und ', kbd('↵'), ' oder per Klick. An der Stelle steht jetzt ein Link mit ihrem Titel.'],
      ),
      p('Gibt es die Notiz noch nicht, bietet dir die Liste unter ', b('Neu anlegen'), ' zwei Möglichkeiten: den getippten Titel ', b('als Notiz'), ' (auf oberster Ebene) oder ', b('als Unterseite'), ' der aktuellen Notiz. So kannst du beim Schreiben einfach Links auf Themen setzen, die du später ausarbeiten willst.'),
      tip('Noch schneller: Zieh eine Notiz aus der Seitenleiste direkt an die gewünschte Stelle im Text.'),

      h3('Links benutzen'),
      p('Ein Klick auf einen Notiz-Link öffnet die verlinkte Notiz. Fährst du nur mit der Maus darüber, zeigt Mitschrift eine kleine Vorschau mit Titel und Textanfang – du musst die aktuelle Notiz also gar nicht verlassen, um kurz nachzuschauen.'),

      h2('Notiz als Zeile oder Karte'),
      p('Ein Link im Fließtext ist unauffällig. Soll ein Verweis mehr Gewicht bekommen – etwa auf einer Übersichtsseite für ein ganzes Fach –, fügst du die Notiz als eigenen Block ein:'),
      table(
        ['Darstellung', 'Wie sie aussieht', 'Einfügen'],
        [b('Link'), 'Normaler Text-Link im Satz', [code('[['), ' im Text']],
        [b('Zeile'), 'Eigene schmale Zeile mit Symbol und Titel', b('/notiz als zeile')],
        [b('Karte'), 'Kachel mit Vorschau des Inhalts', b('/notiz als karte')],
      ),
      p('Mehrere Karten hintereinander ordnen sich automatisch zu einem Raster – ideal für eine Startseite, die zu allen Themen eines Fachs führt. Über ', b('Darstellung'), ' in der Optionsleiste wechselst du jederzeit zwischen Link, Zeile und Karte, wählst bei Karten die Größe und blendest einen Untertitel ein oder aus. ', b('Öffnen'), ' springt zur Notiz.'),
      p('Auch einen vorhandenen Link im Text kannst du umwandeln: Fahr mit der Maus darüber und wähle in der Vorschau Zeile oder Karte.'),

      h2('Was unter jeder Notiz steht'),
      p('Ganz unten in jeder Notiz sammelt Mitschrift automatisch, wie sie mit anderen zusammenhängt:'),
      ul(
        [b('Unterseiten'), ' – alle Notizen, die direkt unter dieser einsortiert sind, mit einem Knopf für eine ', b('Neue Unterseite'), '.'],
        [b('Verlinkt von'), ' – alle Notizen, die auf diese hier verlinken (sogenannte Rückverweise). So findest du Zusammenhänge auch in der Gegenrichtung.'],
        [b('Fußnoten'), ' – falls die Notiz welche hat (', noteLink('bloecke-formeln-code', 'Formeln, Code & Fußnoten'), ').'],
      ),
      p('Das musst du nicht pflegen: Sobald du einen Link setzt oder entfernst, aktualisiert sich alles von selbst.'),

      h2('Die Graph-Ansicht'),
      p('Die Graph-Ansicht (Seitenleiste → ', b('Graph-Ansicht'), ' oder ', kbd('⌃⌘G'), ') zeigt alle deine Notizen als Punkte. Linien verbinden sie:'),
      ul(
        [b('Durchgezogene Linie mit Pfeil'), ' – eine Notiz verlinkt auf eine andere.'],
        [b('Gestrichelte Linie'), ' – eine Notiz ist Unterseite einer anderen.'],
      ),
      p('Je mehr Verbindungen eine Notiz hat, desto größer ist ihr Punkt – so siehst du schnell, welche Themen zentral sind.'),
      h3('Bedienung'),
      ul(
        'Scrollen zoomt zum Mauszeiger, Ziehen auf freier Fläche verschiebt die Ansicht. Die Knöpfe unten rechts zoomen ebenfalls; „Alles einpassen“ zeigt wieder den ganzen Graphen.',
        'Punkte lassen sich mit der Maus wegziehen, um ein Knäuel zu entwirren.',
        'Ein Klick auf einen Punkt öffnet die Notiz.',
        ['Im Feld ', b('Hervorheben …'), ' oben tippst du einen Suchbegriff – passende Notizen leuchten auf.'],
        ['Mit den Schaltern ', b('Unterseiten'), ', ', b('Ohne Verbindung'), ' und ', b('Titel'), ' blendest du Unterseiten-Linien, unverbundene Notizen und die Beschriftungen ein oder aus.'],
      ),
      tip('Ist dein Graph noch leer, liegt das nur daran, dass es noch keine Verbindungen gibt. Lege eine Notiz mit zwei, drei Unterseiten an und setze ein paar Links mit ', code('[['), ' – schon entsteht dein erstes Netz.'),
    ],
  }),
};

export default page;
