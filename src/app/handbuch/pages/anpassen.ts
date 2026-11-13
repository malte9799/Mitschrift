import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'anpassen',
  title: 'Darstellung anpassen',
  parent: 'main',
  order: 130,
  section: 'Daten & Einstellungen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Mitschrift soll sich für dich angenehm anfühlen – bei Tageslicht in der Schule genauso wie abends am Schreibtisch. Alle Einstellungen merkt sich Mitschrift auf deinem Gerät.'),

      h2('Farbschema'),
      p('Unter ', b('Mitschrift → Erscheinungsbild'), ' wählst du eines von neun Farbschemata. Schneller geht es mit dem kleinen farbigen Punkt oben in der Seitenleiste neben dem Logo: Jeder Klick schaltet zum nächsten Schema weiter.'),
      table(
        ['Schema', 'Charakter'],
        [b('Hell'), 'Klar und neutral – der Standard.'],
        [b('Dunkel'), 'Augenschonend am Abend.'],
        [b('Automatisch'), 'Folgt der Einstellung deines Systems: tagsüber hell, nachts dunkel.'],
        [b('Mist'), 'Helles, kühles Grau-Blau.'],
        [b('Linen'), 'Warmes, papierartiges Weiß.'],
        [b('Sepia'), 'Wie ein altes Buch – angenehm für langes Lesen.'],
        [b('Graphite'), 'Gedämpftes dunkles Grau.'],
        [b('Slate'), 'Dunkles Schiefer-Blau.'],
        [b('Midnight'), 'Sehr dunkel, fast schwarz.'],
      ),
      tip('Bilder mit weißem Hintergrund – etwa abfotografierte Skizzen – wirken in dunklen Schemata oft grell. Unter ', b('Mehr → Im Dunkelmodus umkehren'), ' am Bild werden sie dort automatisch invertiert.'),

      h3('Code-Theme'),
      p('Codeblöcke haben ein eigenes Farbschema: ', b('Darstellung → Code-Theme'), '. Zur Wahl stehen bekannte Themes wie GitHub Light und Dark, Atom One, Dracula, Nord, Gruvbox, Material, Tokyo Night oder VS Code Dark. ', b('Automatisch'), ' wählt passend zum hellen bzw. dunklen Farbschema.'),

      h2('Dokument vergrößern'),
      p('Ist dir die Schrift zu klein oder zu groß, zoomst du nur das Dokument – Menüleiste und Seitenleisten bleiben dabei gleich groß:'),
      ul(
        [kbd('⌘+'), ' vergrößert, ', kbd('⌘−'), ' verkleinert, ', kbd('⌘0'), ' setzt auf 100 % zurück.'],
        [kbd('⌘'), ' + Mausrad oder das Zusammenziehen mit zwei Fingern auf dem Trackpad zoomt ebenfalls.'],
        ['Solange nicht 100 % eingestellt ist, zeigt die Kopfleiste der Notiz die aktuelle Größe an. Ein Klick darauf setzt zurück.'],
      ),
      note('Der Zoom gilt für Notizen und dieses Handbuch gleichermaßen. Blöcke mit eigenem Zoom – Funktionsplotter, Zeitstrahl, Graph – zoomen bei ', kbd('⌘'), ' + Mausrad nur sich selbst, wenn die Maus über ihnen steht.'),

      h2('Leisten ein- und ausblenden'),
      table(
        ['Was', 'Wie'],
        [b('Seitenleiste'), [kbd('⌘B'), ' (wenn kein Text markiert ist) oder das Menü-Symbol oben links']],
        [b('Block-Leiste'), [kbd('⇧⌘B'), ' (wenn kein Text markiert ist) oder ', b('Blöcke & Format'), ' oben rechts']],
        [b('Vollbild'), [kbd('⌃⌘F'), ' oder ', b('Darstellung → Vollbildmodus')]],
        [b('Glossar-Unterstreichung'), b('Darstellung → Begriffe hervorheben')],
      ),
      p('Zum konzentrierten Schreiben: Seitenleiste und Block-Leiste ausblenden, Vollbild an – dann bleibt nur noch dein Text.'),

      h2('Auf Tablet und Smartphone'),
      p('Auf schmalen Bildschirmen legt sich die Seitenleiste über die Notiz und schließt sich nach der Auswahl von selbst. Spalten rutschen untereinander, und Randnotizen werden zu kleinen Pins. Die Handbuch-Navigation verschwindet ebenfalls – blättere dann mit ', b('Zurück'), ' und ', b('Weiter'), ' am Ende jeder Seite.'),
    ],
  }),
};

export default page;
