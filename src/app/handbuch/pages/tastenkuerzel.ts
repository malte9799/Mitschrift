import type { HandbuchPage } from '@/app/handbuch/registry';
import { isMac } from '@/ui/shortcut';
import { b, h2, kbd, note, noteLink, p, table, type InlineGroup } from '@/app/handbuch/blocks';

/** Zeile „Kürzel | Aktion“; mehrere Kürzel werden mit „oder“ verbunden. */
const row = (keys: string | string[], action: InlineGroup): InlineGroup[] => {
  const list = Array.isArray(keys) ? keys : [keys];
  return [list.flatMap((k, i) => (i ? [' oder ', kbd(k)] : [kbd(k)])), action];
};
const head = ['Kürzel', 'Aktion'];

const page: HandbuchPage = {
  key: 'tastenkuerzel',
  title: 'Tastenkürzel',
  parent: 'main',
  order: 140,
  section: 'Daten & Einstellungen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Alle Tastenkürzel auf einen Blick. Die meisten stehen auch in der Menüleiste neben dem jeweiligen Befehl – schau dort nach, wenn du eins vergessen hast.'),
      note(
        isMac
          ? 'Die Kürzel sind in Mac-Schreibweise angegeben: ⌘ = Befehl, ⌥ = Option, ⌃ = Control, ⇧ = Umschalt.'
          : 'Die Kürzel sind für Windows und Linux angegeben. Auf dem Mac entspricht Strg der Befehlstaste ⌘ und Alt der Optionstaste ⌥.',
      ),

      h2('Allgemein'),
      table(
        head,
        row('⌘K', 'Suchen & Befehle – Notizen, Blöcke, Befehle, Glossar, Handbuch'),
        row('⌘F', 'Seitenleiste durchsuchen'),
        row('⌥⌘N', 'Neue Notiz'),
        row('⇧⌥⌘N', 'Neue Unterseite der offenen Notiz'),
        row('⌘P', 'Drucken / als PDF sichern'),
        row('⌘B', 'Seitenleiste ein/aus (wenn nichts markiert ist)'),
        row('⇧⌘B', 'Block-Leiste ein/aus (wenn nichts markiert ist)'),
        row('⌃⌘F', 'Vollbildmodus'),
      ),

      h2('Ansichten und Modi'),
      table(
        head,
        row('⌃⌘E', 'Bearbeitungsmodus'),
        row('⌃⌘L', 'Lernmodus'),
        row('⌃⌘H', 'Übersicht'),
        row('⌃⌘G', 'Graph-Ansicht'),
        row('⌃⌘B', 'Glossar'),
        row('⌃⌘K', 'Kalender'),
        row('⌥⌘P', 'Präsentieren'),
        row('⇧⌥⌘P', 'Ab aktueller Stelle präsentieren'),
        row('⌘+', 'Dokument vergrößern'),
        row('⌘−', 'Dokument verkleinern'),
        row('⌘0', 'Originalgröße'),
      ),

      h2('Bearbeiten'),
      table(
        head,
        row('⌘Z', 'Widerrufen'),
        row('⇧⌘Z', 'Wiederholen'),
        row(['⌘X', '⌘C', '⌘V'], 'Ausschneiden, Kopieren, Einsetzen'),
        row('⌘A', 'Alle Blöcke markieren (im Codeblock: erst nur den Code)'),
        row('⇧⌘G', 'Markierten Text als Begriff ins Glossar'),
        row('⌥⌘M', 'Markierten Text kommentieren'),
        row('⇧↵', 'Zeilenumbruch im selben Absatz'),
        row('⇥', 'Listenpunkt einrücken / nächste Tabellenzelle'),
        row('⇧⇥', 'Listenpunkt ausrücken'),
      ),

      h2('Text formatieren'),
      table(
        head,
        row('⌘B', 'Fett'),
        row('⌘I', 'Kursiv'),
        row('⌘U', 'Unterstrichen'),
        row('⇧⌘S', 'Durchgestrichen'),
        row('⌘E', 'Inline-Code'),
        row('⇧⌘K', 'Taste'),
        row('⇧⌘L', 'Als Lücke markieren'),
        row('⇧⌘M', 'Formel einfügen'),
        row('⇧⌘E', 'Zentriert'),
        row('⇧⌘R', 'Rechtsbündig'),
        row('⇧⌘J', 'Blocksatz'),
      ),

      h2('Absatzstile und Listen'),
      table(
        head,
        row('⌥⌘1', 'Überschrift 1'),
        row('⌥⌘2', 'Überschrift 2'),
        row('⌥⌘3', 'Überschrift 3'),
        row('⌥⌘0', 'Text'),
        row('⇧⌘B', 'Zitat (bei markiertem Text)'),
        row('⇧⌘8', 'Aufzählung'),
        row('⇧⌘7', 'Nummerierte Liste'),
        row('⇧⌘9', 'Aufgabenliste'),
      ),
      p('Dazu kommen die Markdown-Abkürzungen beim Tippen (', b('#'), ', ', b('-'), ', ', b('1.'), ', ', b('[ ]'), ', ', b('>'), ', ', b('```'), ', ', b('---'), ', ', b('$$'), ' …) – siehe ', noteLink('schreiben', 'Schreiben & Formatieren'), '.'),

      h2('Markierte Blöcke'),
      table(
        head,
        row(['⌫', 'Entf'], 'Markierte Blöcke löschen'),
        row('↵', 'In den ersten markierten Block springen'),
        row('Esc', 'Markierung aufheben'),
      ),

      h2('Präsentation'),
      table(
        head,
        row(['→', 'Leertaste'], 'Weiter'),
        row(['←', '⌫'], 'Zurück'),
        row(['O', 'G'], 'Folienübersicht'),
        row('S', 'Schrittweise einblenden'),
        row('L', 'Laserpointer'),
        row(['B', '.'], 'Schwarzer Bildschirm'),
        row('F', 'Vollbild'),
        row('Esc', 'Beenden'),
      ),
    ],
  }),
};

export default page;
