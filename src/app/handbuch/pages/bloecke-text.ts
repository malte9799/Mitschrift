import type { HandbuchPage } from '@/app/handbuch/registry';
import { h1, h2, li, p, t, tip } from '@/app/handbuch/blocks';
import { formatShortcut } from '@/ui/shortcut';

const page: HandbuchPage = {
  key: 'bloecke-text',
  title: 'Text, Listen & Hervorheben',
  parent: 'bloecke',
  doc: () => ({
    type: 'doc',
    content: [
      // ================= Textstile =================
      h1('Textstile'),
      p(t('Überschriften mit „#“, „##“ oder „###“ am Zeilenanfang, oder über die Formatleiste bzw. „/“.')),
      { type: 'heading', attrs: { level: 1 }, content: [t('Überschrift 1')] },
      { type: 'heading', attrs: { level: 2 }, content: [t('Überschrift 2')] },
      { type: 'heading', attrs: { level: 3 }, content: [t('Überschrift 3')] },
      { type: 'paragraph', attrs: { variant: 'strong' }, content: [t('Fett als eigener Block – größer als normaler Fettdruck, für kurze Merksätze.')] },
      { type: 'paragraph', attrs: { variant: 'caption' }, content: [t('Beschriftung – klein und gedämpft, z. B. unter einem Bild.')] },
      p(
        t('Inline-Formatierung über die Formatleiste bei markiertem Text oder Tastenkürzel: '),
        t('fett', ['bold']),
        t(', '),
        t('kursiv', ['italic']),
        t(', '),
        t('durchgestrichen', ['strike']),
        t(', '),
        t('Code', ['code']),
        t(', '),
        t('Taste', ['kbd']),
        t(` (${formatShortcut('⌘⇧K')}), H`),
        t('2', ['subscript']),
        t('O tiefgestellt, x'),
        t('2', ['superscript']),
        t(' hochgestellt.'),
      ),

      // ================= Listen =================
      h1('Listen'),
      p(t('Aufzählung mit „-“ oder „*“ + Leerzeichen, nummeriert mit „1.“ + Leerzeichen, Aufgaben mit „x“ + Leerzeichen.')),
      { type: 'bulletList', content: [li(t('Erster Punkt')), li(t('Zweiter Punkt'))] },
      { type: 'orderedList', attrs: { start: 1 }, content: [li(t('Erster Schritt')), li(t('Zweiter Schritt'))] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [p(t('Erledigte Aufgabe'))] },
          { type: 'taskItem', attrs: { checked: false, dueDate: null, dueTime: '', eventId: null }, content: [p(t('Offene Aufgabe – mit Datum entsteht automatisch ein Kalendertermin'))] },
        ],
      },
      tip(t('Setze bei einer Aufgabe ein Fälligkeitsdatum (Kalender-Symbol beim Antippen der Zeile) – der Termin taucht dann im '), t('Kalender', ['bold']), t(' auf und wird beim Abhaken erledigt markiert.')),
      h2('Toggle-Liste'),
      p(t('Zugeklappte Zeile mit Titel und verborgenem Inhalt – ideal zum Selbst-Abfragen. Im Lernmodus startet sie immer zu.')),
      { type: 'toggleBlock', attrs: { summary: 'Was ist die Hauptstadt von Australien?', open: true }, content: [p(t('Canberra – nicht Sydney.'))] },

      // ================= Hervorheben =================
      h1('Hervorheben'),
      { type: 'blockquote', content: [p(t('Ein Zitat – für Aussagen, Quelltexte oder Merksätze im Fließtext.'))] },
      p(t('Callouts im GitHub-Stil, wahlweise als Strich oder Fläche (Stil-Menü am Block):')),
      { type: 'callout', attrs: { variant: 'note' }, content: [p(t('Hinweis – neutrale Zusatzinfo.'))] },
      { type: 'callout', attrs: { variant: 'tip' }, content: [p(t('Tipp – ein nützlicher Kniff.'))] },
      { type: 'callout', attrs: { variant: 'important' }, content: [p(t('Wichtig – das sollte man sich merken.'))] },
      { type: 'callout', attrs: { variant: 'warning' }, content: [p(t('Warnung – hier ist Vorsicht geboten.'))] },
      { type: 'callout', attrs: { variant: 'caution' }, content: [p(t('Vorsicht – ein häufiger Fehler oder ein Risiko.'))] },
    ],
  }),
};

export default page;
