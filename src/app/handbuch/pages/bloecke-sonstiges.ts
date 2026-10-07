import type { HandbuchPage } from '@/app/handbuch/registry';
import { h1, h2, p, t } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke-sonstiges',
  title: 'Formeln, Fußnoten & Sonstiges',
  parent: 'bloecke',
  doc: () => ({
    type: 'doc',
    content: [
      h2('Formel'),
      p(
        t('Inline mit '),
        t('$…$', ['code']),
        t(', z. B. '),
        { type: 'mathInline', attrs: { latex: 'E = mc^2' } },
        t('. Ein eigener Formel-Block entsteht mit '),
        t('$$', ['code']),
        t(' + Leerzeichen oder Enter:'),
      ),
      { type: 'mathBlock', attrs: { latex: '\\int_0^1 x^2 \\, dx = \\frac{1}{3}' } },

      h2('Fußnote'),
      p(t('Im Text steht nur die hochgestellte Nummer, automatisch durchnummeriert'), { type: 'footnote', attrs: { text: 'So sieht eine Fußnote aus – Quelle, Zitat oder Anmerkung.' } }, t('. Ein Klick öffnet die Bearbeitung; unter der Notiz stehen alle gesammelt.')),

      h1('Trennlinien'),
      p(t('Fünf Varianten über „/“: extra dünn (Punkte), dünn (gepunktet), regulär, fett – oder ein Seitenumbruch, der die Notiz in Druck-Seiten unterteilt (für den PDF-Export).')),
      { type: 'horizontalRule', attrs: { variant: 'dots' } },
      { type: 'horizontalRule', attrs: { variant: 'bold' } },

      h1('Externe Links'),
      p(t('Einen Link auf eine externe Seite einfügen und danach per Klick in eine Zeile (Favicon, Titel, Domain), ein eingebettetes Bild, Video oder Audio umwandeln – erkennt YouTube, Vimeo, Spotify & Co. automatisch.')),
      { type: 'smartLink', attrs: { href: 'https://de.wikipedia.org/wiki/Photosynthese', view: 'row', title: 'Photosynthese – Wikipedia' } },

      h1('Und sonst?'),
      p(
        t('Weitere Beispiele zu Formeln, Fußnoten, Taste sowie Markdown-Einfügen (z. B. '),
        t('$a^2+b^2=c^2$', ['code']),
        t(' oder '),
        t('[^1]', ['code']),
        t(') zeigt die Notiz „Showcase“ unter '),
        t('/showcase', ['code']),
        t('. Export (Markdown, HTML, PDF, Text, RTF) und Präsentationsmodus findest du oben rechts in jeder Notiz.'),
      ),
    ],
  }),
};

export default page;
