import type { NotePatch } from '@/storage';

const p = (...content: object[]) => ({ type: 'paragraph', content });
const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });

/** Beispiel-Notiz für den ersten Start – zeigt jeden Lern-Block einmal. */
export function welcomeNote(): NotePatch {
  const doc = {
    type: 'doc',
    content: [
      p(t('Mitschrift ist ein ruhiger Ort für deine Notizen – mit Blöcken, die du im '), t('Lernmodus', ['bold']), t(' direkt zum Üben benutzen kannst. Oben in der Leiste zwischen „Bearbeiten“ und „Lernen“ wechseln.')),
      { type: 'heading', attrs: { level: 2 }, content: [t('Aufklappen')] },
      {
        type: 'toggleBlock',
        attrs: { summary: 'Was ist die Hauptstadt von Australien?', open: true },
        content: [p(t('Canberra – nicht Sydney.'))],
      },
      { type: 'heading', attrs: { level: 2 }, content: [t('Lückentext')] },
      p(
        t('Die Mitochondrien sind das '),
        t('Kraftwerk', ['cloze']),
        t(' der Zelle. Die Fotosynthese findet in den '),
        t('Chloroplasten', ['cloze']),
        t(' statt.'),
      ),
      {
        type: 'callout',
        attrs: { variant: 'tip' },
        content: [p(t('Text markieren und in der Toolbar auf das Lücken-Symbol klicken (oder ⌘⇧L), um eine Lücke zu machen.'))],
      },
      { type: 'heading', attrs: { level: 2 }, content: [t('Karteikarten')] },
      {
        type: 'flashcards',
        attrs: {
          cards: [
            { front: 'Photosynthese', back: 'Umwandlung von Lichtenergie in chemische Energie (Glucose).' },
            { front: 'Osmose', back: 'Diffusion von Wasser durch eine semipermeable Membran.' },
            { front: 'Enzym', back: 'Biokatalysator, der Reaktionen beschleunigt, ohne verbraucht zu werden.' },
          ],
        },
      },
      { type: 'heading', attrs: { level: 2 }, content: [t('Quiz')] },
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
            {
              question: 'Wie heißt der Transport gegen ein Konzentrationsgefälle?',
              options: ['Aktiver Transport', 'Diffusion', 'Osmose'],
              correct: 0,
              why: 'Er braucht Energie (ATP), deshalb „aktiv“.',
            },
          ],
        },
      },
      p(t('Tippe „/“ in einer leeren Zeile, um weitere Blöcke einzufügen.')),
    ],
  };
  return { title: 'Willkommen bei Mitschrift', content: JSON.stringify(doc) };
}
