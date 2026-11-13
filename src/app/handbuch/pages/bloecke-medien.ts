import type { HandbuchPage } from '@/app/handbuch/registry';
import { h2, note, p, t } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-medien',
  title: 'Medien & Grafik',
  parent: 'bloecke',
  doc: () => ({
    type: 'doc',
    content: [
      h2('Bild'),
      p(t('Datei hochladen, hineinziehen oder einen Bild-Link einfügen. Danach: Zuschneiden, Drehen, Filter, Textumfluss (wie in Word), Hintergrund entfernen.')),
      { type: 'image', attrs: { src: 'https://picsum.photos/seed/mitschrift/640/360' } },

      h2('Bildergalerie'),
      p(t('Mehrere Bilder als Raster, Mosaik, Karussell, Filmstreifen oder Vorher/Nachher-Vergleich. Über „/“ einfügen, dann Bilder hineinziehen.')),
      {
        type: 'gallery',
        attrs: {
          title: 'Fotos',
          layout: 'grid',
          columns: 2,
          fit: 'cover',
          captions: true,
          items: [
            { id: 'i1', src: 'https://picsum.photos/seed/mitschrift1/400/300', caption: 'Bild 1' },
            { id: 'i2', src: 'https://picsum.photos/seed/mitschrift2/400/300', caption: 'Bild 2' },
          ],
        },
      },

      h2('SVG-Grafik'),
      p(t('SVG-Code einfügen (Tastatur oder Ziehen einer .svg-Datei) – mit eigenem Editor für Farben, Linienstärke, Hintergrund, Drehung und Ausrichtung.')),
      {
        type: 'svg',
        attrs: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#5B8DEF"/><circle cx="60" cy="40" r="22" fill="#fff"/></svg>',
        },
      },

      h2('Whiteboard'),
      p(t('Freies Zeichnen (Excalidraw): Skizzen, Mindmaps, Handschrift. Ein Klick öffnet ein eigenes Zeichenfenster; in der Notiz steht eine Vorschau.')),
      { type: 'whiteboard', attrs: { scene: { elements: [], files: {} }, svg: '' } },
      note(t('Über „/“ → „Whiteboard“ einfügen – das Zeichenfenster öffnet sich direkt.')),

      h2('Abkürzungsverzeichnis'),
      p(t('Listet automatisch alle Glossar-Begriffe auf, die in dieser Notiz vorkommen (oder wahlweise alle aus dem '), t('Glossar', ['bold']), t(' unter „Mehr“ in der Seitenleiste) – ohne Handarbeit.')),
      { type: 'glossaryList', attrs: { title: 'Abkürzungsverzeichnis', scope: 'note' } },
    ],
  }),
};

export default page;
