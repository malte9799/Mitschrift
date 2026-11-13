import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, important, kbd, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'export',
  title: 'Export, Drucken & Backup',
  parent: 'main',
  order: 110,
  section: 'Daten & Einstellungen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Deine Notizen gehören dir. Du kannst jede einzelne Notiz in gängige Formate exportieren oder ausdrucken – und mit einem Backup alle Notizen auf einmal sichern.'),

      h2('Eine Notiz exportieren'),
      p('Öffne die Notiz und wähle ', b('Ablage → Exportieren'), '. Es gibt fünf Formate:'),
      table(
        ['Format', 'Geeignet für'],
        [b('PDF'), 'Abgeben, Teilen, Ausdrucken. Öffnet den Druckdialog – dort „Als PDF sichern“ wählen. Der Text bleibt scharf und durchsuchbar.'],
        [b('Markdown'), 'Andere Notiz-Apps (Obsidian, Notion …), GitHub, Texteditoren. Formeln, Fußnoten, Checklisten und Hinweis-Kästen bleiben erhalten.'],
        [b('HTML'), 'Eine eigenständige Webseite mit allen Bildern – öffnet sich in jedem Browser.'],
        [b('Reiner Text'), 'Nur der Text, ohne jede Formatierung.'],
        [b('Rich Text (RTF)'), 'Word, Pages, LibreOffice – mit Formatierung und Bildern.'],
      ),
      p('Interaktive Blöcke werden dabei in eine lesbare Form gebracht: Karteikarten und Quiz als Tabelle mit Fragen und Antworten, Diagramme und Zeitstrahl als beschriftete Liste, der Funktionsplotter als Grafik, Sammlungen als Tabelle.'),

      h2('Drucken'),
      p(b('Ablage → Drucken …'), ' oder ', kbd('⌘P'), ' öffnet den Druckdialog für die aktuelle Notiz. Das Ergebnis ist für Papier gestaltet: ohne Seitenleiste und Menüs, in gut lesbarer Schrift.'),
      h3('Seiten selbst festlegen'),
      p('Wo eine neue Seite beginnt, bestimmst du mit dem Block ', b('Seitenumbruch'), ' (über ', b('/seitenumbruch'), '). Sobald eine Notiz einen Seitenumbruch enthält, zeigt Mitschrift jede Seite als eigene Karte – du siehst also schon beim Schreiben, wie der Ausdruck aufgeteilt wird.'),
      tip('Für ein Handout: Notiz in Abschnitte gliedern, vor jedem Abschnitt einen Seitenumbruch setzen und dann als PDF sichern.'),

      h2('Backup'),
      p('Ein Backup ist eine einzige Datei mit ', b('allem'), ': allen Notizen, Tags, Glossar-Begriffen, Kalenderterminen sowie allen Bildern und Datei-Anhängen.'),
      h3('Backup sichern'),
      ol(
        ['Wähle ', b('Ablage → Backup aller Notizen sichern …'), '.'],
        ['Mitschrift lädt eine ', b('.json'), '-Datei herunter. Bewahre sie an einem sicheren Ort auf – in deiner Cloud, auf einem USB-Stick oder einer externen Festplatte.'],
      ),
      p('Wann du zuletzt ein Backup gemacht hast, steht unter ', b('Mitschrift → Über Mitschrift'), '.'),
      h3('Backup einspielen'),
      ol(
        ['Wähle ', b('Ablage → Backup einspielen …'), ' und wähle die Backup-Datei aus.'],
        'Mitschrift zeigt dir, von wann das Backup ist und wie viele Notizen es enthält. Bestätige mit Einspielen.',
      ),
      p('Beim Einspielen geht nichts verloren: Vorhandene Notizen bleiben erhalten, neue kommen dazu, und wenn eine Notiz in beiden Fassungen existiert, gewinnt die neuere. Am Ende meldet Mitschrift, wie viele Notizen neu, aktualisiert oder unverändert sind.'),
      tip('Mit einem Backup ziehst du auch auf einen neuen Computer oder in einen anderen Browser um: Backup sichern, auf dem neuen Gerät Mitschrift öffnen, Backup einspielen.'),
      important('Mitschrift speichert alles lokal auf deinem Gerät, nicht in einer Cloud. Mach deshalb regelmäßig ein Backup – zum Beispiel einmal pro Woche oder vor jeder Klausurphase. Warum das wichtig ist, erklärt ', noteLink('speicher', 'Speicherort & Datensicherheit'), '.'),

      h2('Vorlagen weitergeben'),
      ul(
        ['Eine einzelne Notiz gibst du am einfachsten als ', b('Markdown'), ' weiter. Die Empfängerin kopiert den Inhalt und fügt ihn in eine eigene Notiz ein – Mitschrift baut daraus wieder Blöcke (', noteLink('schreiben', 'Schreiben & Formatieren'), ').'],
        ['Für die Klasse oder Lerngruppe zum Lesen eignet sich ', b('PDF'), ' oder ', b('HTML'), '.'],
      ),
    ],
  }),
};

export default page;
