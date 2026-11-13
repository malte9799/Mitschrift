import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, codeBlock, ext, h2, h3, kbd, note, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-diagramme',
  title: 'Diagramme & Zeitstrahl',
  parent: 'bloecke',
  order: 33,
  doc: () => ({
    type: 'doc',
    content: [
      p('Manche Dinge versteht man besser als Bild: einen Ablauf, einen Vergleich, eine Epoche oder den Verlauf einer Funktion. Mitschrift hat dafür eigene Blöcke, die du mit ein paar Einträgen füllst – um das Zeichnen kümmert sich Mitschrift. Die meisten Diagramme bauen sich beim Hineinscrollen mit einer kleinen Animation auf.'),

      h2('Ablauf, Balken und Kreislauf'),
      p('Diese drei Diagramme teilen sich dieselben Daten: eine Liste von Einträgen mit ', b('Titel'), ' und ', b('Text'), ', bei Balken zusätzlich ein ', b('Zahlenwert'), '. Deshalb kannst du jederzeit zwischen ihnen wechseln, ohne etwas neu einzugeben.'),
      h3('So legst du ein Diagramm an'),
      ol(
        ['Tippe ', b('/ablauf'), ', ', b('/balken'), ' oder ', b('/kreislauf'), '.'],
        ['Klicke in der Optionsleiste auf ', b('Daten'), '. Es öffnet sich eine Liste der Einträge.'],
        'Fülle Titel und Text aus, füge Einträge hinzu, verschiebe sie mit den Pfeilen oder entferne sie.',
        ['Mit ', b('Fertig'), ' siehst du das Ergebnis. Über die Symbole in der Optionsleiste wechselst du die Darstellung.'],
      ),
      p(b('Ablauf'), ' – nummerierte Schritte, z. B. für Versuchsanleitungen oder Prozesse:'),
      {
        type: 'diagram',
        attrs: {
          kind: 'steps',
          title: 'Wissenschaftliche Methode',
          items: [
            { label: 'Beobachten', text: 'Ein Phänomen fällt auf und wird genau beschrieben.' },
            { label: 'Hypothese', text: 'Eine überprüfbare Vermutung wird formuliert.' },
            { label: 'Experiment', text: 'Die Hypothese wird unter kontrollierten Bedingungen getestet.' },
            { label: 'Auswerten', text: 'Die Ergebnisse bestätigen oder widerlegen die Hypothese.' },
          ],
        },
      },
      p(b('Balken'), ' – vergleicht Zahlenwerte miteinander:'),
      {
        type: 'diagram',
        attrs: {
          kind: 'bars',
          title: 'Zusammensetzung der Luft',
          items: [
            { label: 'Stickstoff', text: '78 %', value: 78 },
            { label: 'Sauerstoff', text: '21 %', value: 21 },
            { label: 'Argon', text: '0,9 %', value: 0.9 },
          ],
        },
      },
      p(b('Kreislauf'), ' – für Vorgänge, die sich wiederholen:'),
      {
        type: 'diagram',
        attrs: {
          kind: 'cycle',
          title: 'Wasserkreislauf',
          items: [
            { label: 'Verdunstung', text: 'Die Sonne erwärmt Wasser, es steigt als Dampf auf.' },
            { label: 'Kondensation', text: 'Der Dampf kühlt ab und bildet Wolken.' },
            { label: 'Niederschlag', text: 'Wasser fällt als Regen oder Schnee.' },
            { label: 'Abfluss', text: 'Flüsse bringen das Wasser zurück ins Meer.' },
          ],
        },
      },
      note('Ältere Notizen enthalten manchmal noch ein einfaches „Zeitstrahl“-Diagramm aus dieser Familie. Dort bietet die Optionsleiste ', b('Umwandeln'), ' an – daraus wird der neue Zeitstrahl mit echter Zeitachse.'),

      h2('Zeitstrahl'),
      p('Der Zeitstrahl ordnet Ereignisse und Zeiträume auf einer echten Zeitachse an – der Abstand zwischen zwei Einträgen entspricht also der Zeit, die dazwischen liegt. Einfügen über ', b('/zeitstrahl'), '.'),
      {
        type: 'timeline',
        attrs: {
          title: 'Von der Weimarer Republik zum Grundgesetz',
          layout: 'axis',
          entries: [
            { date: '1918', end: '1933', title: 'Weimarer Republik', text: 'Erste parlamentarische Demokratie in Deutschland.', color: 0 },
            { date: '1923', title: 'Hyperinflation', text: 'Das Geld verliert fast täglich an Wert.', color: 1 },
            { date: '1929', title: 'Weltwirtschaftskrise', text: 'Börsencrash in New York; Massenarbeitslosigkeit folgt.', color: 3 },
            { date: '1933', end: '1945', title: 'NS-Diktatur', text: 'Gleichschaltung, Verfolgung und Krieg.', color: 4 },
            { date: '23.05.1949', title: 'Grundgesetz', text: 'Gründung der Bundesrepublik Deutschland.', color: 2 },
          ],
        },
      },
      h3('Einträge bearbeiten'),
      p('Über ', b('Daten'), ' in der Optionsleiste bearbeitest du die Einträge. Jeder hat ein Datum, optional ein Enddatum (dann wird er zum Zeitraum), einen Titel, einen Text und eine Farbe – ein Klick auf den Farbpunkt wechselt sie. Die Reihenfolge ist egal: Mitschrift sortiert chronologisch. Beim Datum versteht Mitschrift viele Schreibweisen:'),
      table(
        ['Schreibweise', 'Beispiel'],
        ['Jahr', code('1789')],
        ['Vor Christus', [code('44 v. Chr.'), ' oder ', code('300 BC')]],
        ['Deutsches Datum', [code('14.07.1789'), ', ', code('07.1789'), ', ', code('14. Juli 1789'), ', ', code('Juli 1789')]],
        ['ISO-Datum', [code('1789-07-14'), ' oder ', code('1789-07')]],
        ['Jahrhundert', code('15. Jh.')],
        ['Heute', [code('heute'), ' – praktisch für Zeiträume, die noch andauern']],
      ),
      h3('Darstellung und Bedienung'),
      ul(
        [b('Achse'), ' oder ', b('Liste'), ' – oben in der Optionsleiste umschaltbar. Die Liste zeigt alle Einträge untereinander, die Achse maßstabsgetreu.'],
        ['Zoomen mit den Plus/Minus-Knöpfen oder mit ', kbd('⌘'), ' + Scrollen; danach lässt sich die Achse seitlich verschieben.'],
        'Ein Klick auf einen Eintrag zeigt seine Details; mit den Pfeilen springst du zum vorherigen oder nächsten Ereignis.',
        'Liegt „heute“ im dargestellten Zeitraum, markiert eine Linie den aktuellen Tag.',
      ),
      tip('Zum Lernen: ', b('Daten verdecken'), ' blendet alle Jahreszahlen aus – so fragst du dich selbst ab, wann was passiert ist. ', b('Aufdecken'), ' zeigt sie wieder.'),

      h2('Funktionsplotter'),
      p('Zeichnet mathematische Funktionen in ein Koordinatensystem – wie ein kleiner Grafikrechner. Einfügen über ', b('/plot'), ' oder ', b('/funktion'), '.'),
      {
        type: 'plot',
        attrs: {
          title: 'Sinus mit Parametern',
          fns: [
            { expr: 'a·sin(b·x)', color: 0 },
            { expr: '0.25x^2 - 2', color: 1 },
          ],
          params: [
            { name: 'a', value: 2, min: -5, max: 5, step: 0.1 },
            { name: 'b', value: 1, min: 0, max: 4, step: 0.05 },
          ],
          points: true,
        },
      },
      h3('Funktionen eingeben'),
      p('Tippe den Term so, wie du ihn im Heft schreiben würdest: ', code('2x^2 - 3x + 1'), ', ', code('a·sin(bx)'), ', ', code('|x|'), ', ', code('√x'), ' oder ', code('f(x) = …'), '. Mitschrift kennt unter anderem ', code('sin'), ', ', code('cos'), ', ', code('tan'), ', ', code('sqrt'), ', ', code('abs'), ', ', code('ln'), ', ', code('log'), ', ', code('lg'), ' und die Konstanten ', code('e'), ' und ', code('pi'), '. Mehrere Funktionen bekommen unterschiedliche Farben.'),
      h3('Parameter mit Schiebereglern'),
      p('Jeder einzelne Buchstabe außer ', code('x'), ' und ', code('e'), ' wird automatisch zum ', b('Parameter'), ' und bekommt einen Schieberegler. Zieh am Regler und beobachte, wie sich der Graph verändert – ideal, um zu verstehen, was ', code('a'), ' oder ', code('b'), ' in einer Funktion bewirken. Minimum und Maximum jedes Reglers stellst du im Bearbeiten-Modus ein.'),
      h3('Bedienung'),
      ul(
        [b('Punkte'), ' in der Optionsleiste markiert Nullstellen, Extrema und Schnittpunkte.'],
        [b('Bereiche'), ' legt den sichtbaren Ausschnitt und die Regler fest.'],
        ['Verschieben durch Ziehen, zoomen mit den Knöpfen oder ', kbd('⌘'), ' + Scrollen. Ein Doppelklick setzt die Ansicht zurück.'],
      ),

      h2('Mermaid'),
      p('Mermaid zeichnet Diagramme aus kurzem Text – Flussdiagramme, Sequenzdiagramme, Mindmaps, Gantt-Pläne, Klassendiagramme und mehr. Einfügen über ', b('/mermaid'), '. Mit ', b('Code'), ' in der Optionsleiste öffnest du den Text darunter; das Diagramm aktualisiert sich beim Tippen.'),
      {
        type: 'mermaid',
        attrs: {
          code: 'flowchart LR\n  A[Licht] --> B(Chlorophyll)\n  B --> C{Fotosynthese}\n  C -->|Produkt| D[Glucose]\n  C -->|Nebenprodukt| E[Sauerstoff]',
        },
      },
      p('Der Code für dieses Diagramm sieht so aus:'),
      codeBlock('plaintext', 'flowchart LR\n  A[Licht] --> B(Chlorophyll)\n  B --> C{Fotosynthese}\n  C -->|Produkt| D[Glucose]\n  C -->|Nebenprodukt| E[Sauerstoff]'),
      ul(
        [code('flowchart LR'), ' – Flussdiagramm von links nach rechts (', code('TD'), ' für oben nach unten).'],
        [code('A[Text]'), ' – eckiger Kasten, ', code('B(Text)'), ' – abgerundet, ', code('C{Text}'), ' – Raute für Entscheidungen.'],
        [code('-->'), ' – Pfeil, ', code('-->|Beschriftung|'), ' – Pfeil mit Text.'],
      ),
      p('Bei Flussdiagrammen kannst du im Bearbeiten-Modus auch direkt auf einen Kasten im Diagramm klicken, um seine Beschriftung zu ändern. Alle Diagrammarten und ihre Schreibweise findest du unter ', ext('https://mermaid.js.org', 'mermaid.js.org'), '.'),
      tip('Du willst ein Mermaid-Diagramm von Hand weiterzeichnen? ', b('Als Excalidraw-Whiteboard einfügen'), ' in der Optionsleiste legt eine Whiteboard-Kopie an, in der du alles frei verschieben und ergänzen kannst.'),
    ],
  }),
};

export default page;
