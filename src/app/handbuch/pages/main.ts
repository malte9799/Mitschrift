import type { HandbuchPage } from '@/app/handbuch/registry';
import { h2, p, pageLink, t, tip } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'main',
  title: 'Handbuch 📖',
  parent: null,
  doc: () => ({
    type: 'doc',
    content: [
      p(t('Schön, dass du hier bist. Mitschrift soll ein ruhiger Ort für deine Notizen sein – dieses Handbuch zeigt dir in Ruhe, was alles geht. Du musst nichts davon auswendig lernen; schau einfach rein, wenn du etwas brauchst.')),

      h2('Fang einfach an'),
      p(t('Du kannst hier nichts kaputt machen. Klick irgendwo in eine Notiz und schreib los. Tippe „'), t('/', ['code']), t('“ in einer leeren Zeile, um einen Block einzufügen, oder markiere Text für die Formatleiste – so entdeckst du die meisten Funktionen ganz von selbst.')),

      h2('Wenn du mehr willst'),
      p(t('Alle Blocktypen – Tabellen, Karteikarten, Formeln, Whiteboards und mehr – stehen mit echtem Beispiel in:')),
      ...pageLink('bloecke', 'Blöcke', t('Jeder Blocktyp, nach Thema sortiert, mit echtem Beispiel zum Ausprobieren.')),

      h2('Notizen miteinander verbinden'),
      p(t('Deine Notizen müssen nicht für sich allein stehen. Wie du sie verlinkst, in Unterseiten sortierst und im Graphen betrachtest, zeigt dir:')),
      ...pageLink('verknuepfen', 'Verknüpfen & Graph-Ansicht', t('Notizen verlinken, Unterseiten anlegen, alles im Graphen sehen.')),

      tip(t('Dieses Handbuch wächst mit der Zeit – weitere Kapitel zu Kalender, Glossar und mehr kommen nach und nach dazu. Links in der Leiste führen dich direkt dorthin. Du findest das Handbuch jederzeit wieder über das Buch-Symbol in der Seitenleiste oder unter '), t('/handbuch', ['code']), t('.')),
    ],
  }),
};

export default page;
