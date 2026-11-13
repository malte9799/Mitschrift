import type { HandbuchPage } from '@/app/handbuch/registry';
import { h1, h2, p, t } from '@/app/handbuch/blocks';
import { formatShortcut } from '@/ui/shortcut';

const page: HandbuchPage = {
  key: 'bloecke-lernen',
  title: 'Lernen & Üben',
  parent: 'bloecke',
  doc: () => ({
    type: 'doc',
    content: [
      p(t('Diese Blöcke werden im '), t('Lernmodus', ['bold']), t(' (oben in der Kopfleiste) interaktiv – zum Selbst-Abfragen statt nur Lesen.')),

      h2('Lückentext'),
      p(t(`Text markieren und in der Formatleiste auf das Lücken-Symbol klicken (oder ${formatShortcut('⌘⇧L')}). Im Lernmodus wird die Lücke zum Eingabefeld.`)),
      p(t('Die Mitochondrien sind das '), t('Kraftwerk', ['cloze']), t(' der Zelle. Die Fotosynthese findet in den '), t('Chloroplasten', ['cloze']), t(' statt.')),

      h2('Karteikarten'),
      p(t('Stapel zum Umdrehen, im Lernmodus als „gewusst“ / „nochmal“ sortierbar.')),
      {
        type: 'flashcards',
        attrs: {
          cards: [
            { front: 'Photosynthese', back: 'Umwandlung von Lichtenergie in chemische Energie (Glucose).' },
            { front: 'Osmose', back: 'Diffusion von Wasser durch eine semipermeable Membran.' },
          ],
        },
      },

      h2('Quiz'),
      p(t('Multiple-Choice-Fragen mit Auswertung und Erklärung.')),
      {
        type: 'quiz',
        attrs: {
          questions: [
            {
              question: 'Welches Organell enthält die DNA einer Eukaryotenzelle?',
              options: ['Ribosom', 'Zellkern', 'Golgi-Apparat'],
              correct: 1,
              why: 'Die DNA liegt im Zellkern (plus etwas in Mitochondrien/Chloroplasten).',
            },
          ],
        },
      },

      h1('Ablauf, Zeitstrahl (Diagramm), Balken, Kreislauf'),
      p(t('Vier animierte Darstellungen für dieselbe Art von Daten – Einträge mit Titel und Text, bei Balken zusätzlich ein Zahlenwert.')),
      {
        type: 'diagram',
        attrs: {
          kind: 'steps',
          title: 'Wissenschaftliche Methode',
          items: [
            { label: 'Beobachten', text: 'Ein Phänomen fällt auf und wird beschrieben.' },
            { label: 'Hypothese', text: 'Eine überprüfbare Vermutung wird formuliert.' },
            { label: 'Experiment', text: 'Die Hypothese wird unter kontrollierten Bedingungen getestet.' },
          ],
        },
      },
      {
        type: 'diagram',
        attrs: {
          kind: 'bars',
          title: 'Zusammensetzung der Luft',
          items: [
            { label: 'Stickstoff', text: '78 %', value: 78 },
            { label: 'Sauerstoff', text: '21 %', value: 21 },
            { label: 'Sonstige', text: '1 %', value: 1 },
          ],
        },
      },
      {
        type: 'diagram',
        attrs: {
          kind: 'cycle',
          title: 'Wasserkreislauf',
          items: [
            { label: 'Verdunstung', text: 'Sonne erwärmt Wasser, es steigt als Dampf auf.' },
            { label: 'Kondensation', text: 'Dampf kühlt ab und bildet Wolken.' },
            { label: 'Niederschlag', text: 'Wasser fällt als Regen oder Schnee.' },
          ],
        },
      },
      p(t('Der eigenständige '), t('Zeitstrahl', ['bold']), t('-Block hat zusätzlich eine echte Zeitachse mit Zoom (Jahre, Daten, auch „v. Chr.“ und Zeiträume):')),
      {
        type: 'timeline',
        attrs: {
          title: 'Weimarer Republik bis Grundgesetz',
          layout: 'axis',
          entries: [
            { date: '1918', end: '1933', title: 'Weimarer Republik', text: 'Erste parlamentarische Demokratie in Deutschland.', color: 0 },
            { date: '1929', title: 'Weltwirtschaftskrise', text: 'Börsencrash in New York; Massenarbeitslosigkeit folgt.', color: 3 },
            { date: '23.05.1949', title: 'Grundgesetz', text: 'Gründung der Bundesrepublik Deutschland.', color: 2 },
          ],
        },
      },

      h2('Funktionsplotter'),
      p(t('Terme mit Schiebereglern für Parameter, Nullstellen/Extrema/Schnittpunkte, Zoom und Verschieben.')),
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
    ],
  }),
};

export default page;
