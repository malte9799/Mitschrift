/** Übersichtsseite für die Block-Kapitel; jedes Thema ist eine eigene Unterseite (siehe pages/bloecke-*.ts). */
import type { HandbuchPage } from '@/app/handbuch/registry';
import { h1, note, p, pageLink, t } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'bloecke',
  title: 'Blöcke',
  parent: 'main',
  doc: () => ({
    type: 'doc',
    content: [
      note(
        t('Mitschrift kennt viele Blocktypen – hier nach Thema sortiert. Tippe „'),
        t('/', ['code']),
        t('“ in einer leeren Zeile, um einen Block einzufügen, oder markiere Text für die Formatleiste.'),
      ),
      p(
        t('Zwei Modi oben in der Kopfleiste: '),
        t('Bearbeiten', ['bold']),
        t(' zum Schreiben, '),
        t('Lernen', ['bold']),
        t(' zum Üben – dort werden Lücken zu Eingabefeldern, Karteikarten drehbar, Quiz auswertbar und Toggles starten zugeklappt.'),
      ),

      h1('Themen'),
      ...pageLink('bloecke-text', 'Text, Listen & Hervorheben'),
      ...pageLink('bloecke-lernen', 'Lernen & Üben'),
      ...pageLink('bloecke-tabellen', 'Tabellen, Sammlung & Code'),
      ...pageLink('bloecke-medien', 'Medien & Grafik'),
      ...pageLink('bloecke-sonstiges', 'Formeln, Fußnoten & Sonstiges'),
    ],
  }),
};

export default page;
