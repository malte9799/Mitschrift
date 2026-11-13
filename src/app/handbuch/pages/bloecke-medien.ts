import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, code, h2, h3, kbd, note, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-medien',
  title: 'Bilder, Medien & Dateien',
  parent: 'bloecke',
  order: 35,
  doc: () => ({
    type: 'doc',
    content: [
      p('Bilder, Skizzen, Grafiken, Dateien und eingebettete Videos – alles, was keine reine Schrift ist. Bilder und Dateien, die du hochlädst, speichert Mitschrift direkt bei deinen Notizen; sie funktionieren also auch ohne Internet.'),

      h2('Bild'),
      h3('Bilder einfügen'),
      p('Es gibt vier Wege:'),
      ul(
        ['Eine Bilddatei aus dem Finder oder Explorer in die Notiz ', b('ziehen'), '.'],
        ['Ein kopiertes Bild oder einen Screenshot mit ', kbd('⌘V'), ' ', b('einfügen'), '.'],
        [b('/bild'), ' tippen und im leeren Bild-Block eine Datei hochladen.'],
        ['Im leeren Bild-Block einen ', b('Bild-Link'), ' einfügen (z. B. ', code('https://…/bild.jpg'), ').'],
      ),
      { type: 'image', attrs: { src: 'https://picsum.photos/seed/mitschrift/640/360' } },
      p('Ein Doppelklick auf ein Bild öffnet den Bild-Editor. Die ', b('Großansicht'), ' erreichst du im Bearbeiten-Modus über ', b('Mehr → Großansicht'), ' – im Lernmodus und beim Präsentieren reicht ein einfacher Klick aufs Bild.'),
      h3('Die Optionsleiste eines Bilds'),
      table(
        ['Knopf', 'Was er tut'],
        [b('Bearbeiten'), 'Öffnet den Bild-Editor (siehe unten).'],
        [b('Bildunterschrift'), 'Blendet eine Zeile für eine Beschriftung unter dem Bild ein oder aus.'],
        [b('Textumbruch'), 'Mit Text in Zeile, links oder rechts mit Text drumherum (wie in Word), vor oder hinter dem Text. In den freien Modi ziehst du das Bild an die gewünschte Stelle.'],
        [b('Größe'), 'Breite des Bildes. Alternativ an den seitlichen Griffen ziehen.'],
        [b('Rahmen'), 'Weich (Standard), ohne Rahmen, Linie, stark gerundet oder als Kreis/Oval.'],
        [b('Mehr'), 'Großansicht, Hintergrund entfernen, Farben umkehren, Im Dunkelmodus umkehren, Bild ersetzen, In Galerie umwandeln, Als PNG sichern – und bei Bildern aus dem Internet „Quelle öffnen“ und „In der Notiz speichern“.'],
      ),
      h3('Der Bild-Editor'),
      p('Der Bild-Editor bearbeitet nicht-destruktiv: Dein Originalbild bleibt immer erhalten, und ', b('Alle Bearbeitungen verwerfen'), ' macht alles rückgängig. Er hat vier Reiter:'),
      ul(
        [b('Zuschneiden'), ' – Ausschnitt frei oder in einem festen Seitenverhältnis (Original, 1:1, 4:3, 3:4, 16:9, 3:2) wählen und das Bild in 90°-Schritten drehen.'],
        [b('Anpassen'), ' – Regler für Helligkeit, Kontrast, Sättigung, Farbton, Schwarz-Weiß, Sepia, Farben umkehren, Weichzeichnen und Deckkraft.'],
        [b('Filter'), ' – fertige Looks auf einen Klick: Scan, S/W, Invertiert, Kräftig, Blass, Sepia, Warm, Kühl und Noir.'],
        [b('Hintergrund'), ' – entfernt den Hintergrund automatisch, etwa bei einem Foto von einem Gegenstand.'],
      ),
      tip('Abfotografierte Tafelbilder oder Arbeitsblätter werden mit dem Filter ', b('Scan'), ' oft viel besser lesbar. Und eine schwarze Skizze auf weißem Grund bleibt im dunklen Farbschema lesbar, wenn du unter Mehr ', b('Im Dunkelmodus umkehren'), ' einschaltest.'),

      h2('Bildergalerie'),
      p('Mehrere Bilder in einem Block, mit fünf Darstellungen. Einfügen über ', b('/galerie'), ', dann Bilder hineinziehen oder über ', b('Bilder'), ' in der Optionsleiste hinzufügen.'),
      {
        type: 'gallery',
        attrs: {
          title: 'Exkursion Wattenmeer',
          layout: 'grid',
          columns: 3,
          fit: 'cover',
          captions: true,
          items: [
            { id: 'i1', src: 'https://picsum.photos/seed/mitschrift1/600/400', caption: 'Ankunft' },
            { id: 'i2', src: 'https://picsum.photos/seed/mitschrift2/600/400', caption: 'Wattwanderung' },
            { id: 'i3', src: 'https://picsum.photos/seed/mitschrift3/600/400', caption: 'Proben nehmen' },
          ],
        },
      },
      table(
        ['Darstellung', 'Geeignet für'],
        [b('Raster'), 'Gleich große Kacheln – die Spaltenzahl stellst du mit Plus und Minus ein.'],
        [b('Mosaik'), 'Bilder in ihrem eigenen Format, lückenlos ineinander verschachtelt.'],
        [b('Karussell'), 'Ein großes Bild nach dem anderen, mit Pfeilen zum Blättern.'],
        [b('Streifen'), 'Eine Bilderreihe zum seitlichen Durchscrollen.'],
        [b('Vergleich'), 'Die ersten beiden Bilder übereinander, mit einem Schieber dazwischen – ideal für Vorher/Nachher.'],
      ),
      p('Einzelne Bilder machst du zur Galerie, indem du sie markierst und in der Optionsleiste ', b('Markierte in Galerie umwandeln'), ' wählst. Mehrere markierte Galerien lassen sich ebenso zusammenführen.'),

      h2('Whiteboard'),
      p('Ein Whiteboard ist eine freie Zeichenfläche für Skizzen, Mindmaps, Schaubilder oder Handschrift – mit Formen, Pfeilen, Text und Freihand-Stift. Einfügen über ', b('/whiteboard'), ' oder ', b('/zeichnen'), '; das Zeichenfenster öffnet sich sofort im Vollbild.'),
      ol(
        'Zeichne mit den Werkzeugen oben: Auswählen, Rechteck, Ellipse, Pfeil, Linie, Freihand, Text, Bild …',
        'Schließe das Fenster, wenn du fertig bist. In der Notiz steht dann eine Vorschau deiner Zeichnung.',
        ['Ein Klick auf die Vorschau – oder ', b('Zeichnen'), ' in der Optionsleiste – öffnet das Whiteboard wieder.'],
      ),
      { type: 'whiteboard', attrs: { scene: { elements: [], files: {} }, svg: '' } },
      note('Die Vorschau eines Whiteboards passt sich dem hellen und dunklen Farbschema an.'),

      h2('SVG-Grafik'),
      p('SVG ist ein Format für Vektorgrafiken – Icons, Logos, Schaubilder –, die in jeder Größe scharf bleiben. So bekommst du eine SVG-Grafik in die Notiz:'),
      ul(
        ['SVG-Code (beginnt mit ', code('<svg'), ') kopieren und in eine leere Zeile einfügen.'],
        ['Eine ', code('.svg'), '-Datei in die Notiz ziehen.'],
        [b('/svg'), ' tippen und im leeren Block Code einfügen, eine Datei wählen oder mit ', b('Leer zeichnen'), ' auf einem leeren Blatt beginnen.'],
      ),
      {
        type: 'svg',
        attrs: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect x="4" y="4" width="152" height="92" rx="16" fill="#5B8DEF"/><circle cx="56" cy="50" r="24" fill="#fff"/><path d="M96 34h40M96 50h30M96 66h36" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>',
        },
      },
      p('Ein Doppelklick (oder ', b('Bearbeiten'), ') öffnet den ', b('SVG-Editor'), '. Dort wählst du Elemente aus, verschiebst sie, änderst Füllung, Kontur, Strichstärke, Linienstil, Deckkraft und Schriftgröße, ordnest Ebenen nach vorne oder hinten und legst einen Hintergrund fest – zum Beispiel kariert. In der Optionsleiste richtest du die Grafik links, mittig oder rechts aus und ergänzt eine Beschriftung.'),
      tip('Über ', b('Umwandeln in'), ' wird aus einer SVG-Grafik ein Whiteboard (zum freien Weiterzeichnen) oder eine Galerie.'),

      h2('Datei-Anhang'),
      p('Für alles, was kein Bild ist: PDFs, Arbeitsblätter, Präsentationen, ZIP-Archive. Einfügen über ', b('/datei'), ' oder ', b('/anhang'), ', dann über ', b('Datei wählen'), ' eine Datei aussuchen – oder sie auf den leeren Anhang-Block ziehen. Der Anhang erscheint als Zeile mit Dateiname, Typ und Größe; über ', b('Herunterladen'), ' öffnest oder speicherst du ihn.'),

      h2('Links auf Webseiten, Videos und Musik'),
      p('Ein normaler Link steht im Text. Fährst du mit der Maus darüber, kannst du ihn in einen eigenen Block umwandeln. Welche Darstellungen möglich sind, hängt vom Link ab:'),
      table(
        ['Darstellung', 'Wie sie aussieht'],
        [b('Link'), 'Ganz normal im Fließtext.'],
        [b('Zeile'), 'Eigene Zeile mit Seitensymbol, Titel und Domain – übersichtlich für Quellenlisten.'],
        [b('Bild'), 'Bei direkten Bild-Links: das Bild selbst.'],
        [b('Video'), 'Videos von YouTube und Vimeo werden direkt in der Notiz abspielbar.'],
        [b('Audio'), 'Spotify-Titel, -Alben und -Playlists als eingebetteter Player.'],
      ),
      { type: 'smartLink', attrs: { href: 'https://de.wikipedia.org/wiki/Fotosynthese', view: 'row', title: 'Fotosynthese – Wikipedia' } },
      p('Die Darstellung wechselst du jederzeit über ', b('Darstellung'), ' in der Optionsleiste; dort kannst du auch den angezeigten Titel ändern. ', b('Öffnen'), ' öffnet die Seite in einem neuen Tab.'),
    ],
  }),
};

export default page;
