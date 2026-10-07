import type { NotePatch } from '@/storage';

const p = (...content: object[]) => ({ type: 'paragraph', content });
const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const tip = (...content: object[]) => ({ type: 'callout', attrs: { variant: 'tip' }, content: [p(...content)] });

/** Willkommens-Notiz für den ersten Start – kurzer Überblick, mit Verweis aufs Handbuch für alle Blöcke. */
export function welcomeNote(): NotePatch {
  const doc = {
    type: 'doc',
    content: [
      p(t('Willkommen bei '), t('Mitschrift', ['bold']), t(' 👋 – einem ruhigen Ort für deine Notizen, mit Blöcken, die du im '), t('Lernmodus', ['bold']), t(' direkt zum Üben benutzen kannst.')),
      h2('So schreibst du'),
      p(t('Klick irgendwo hin und leg los. Tippe „'), t('/', ['code']), t('“ in einer leeren Zeile für weitere Blöcke – Tabellen, Bilder, Formeln, Karteikarten, Diagramme und mehr –, oder markiere Text für die Formatleiste.')),
      h2('Üben statt nur lesen'),
      p(t('Oben in der Kopfleiste zwischen „Bearbeiten“ und „Lernen“ wechseln. Im Lernmodus wird eine Lücke zum Eingabefeld, zum Beispiel: Die Mitochondrien sind das '), t('Kraftwerk', ['cloze']), t(' der Zelle.')),
      {
        type: 'toggleBlock',
        attrs: { summary: 'Kurz ausprobieren: Was ist die Hauptstadt von Australien?', open: true },
        content: [p(t('Canberra – nicht Sydney. So funktioniert eine Aufklapp-Frage zum Selbst-Abfragen.'))],
      },
      h2('Alle Blöcke im Handbuch'),
      p(t('Jeder Blocktyp – mit Erklärung und echtem Beispiel – steht im '), t('Handbuch', ['bold']), t(' (Buch-Symbol in der Seitenleiste, oder direkt unter '), t('/handbuch', ['code']), t(').')),
      tip(t('Fächer, Kalender und Glossar findest du ebenfalls in der Seitenleiste. Diese Notiz hier darfst du bedenkenlos verändern oder löschen – sie ist nur zum Ausprobieren da.')),
    ],
  };
  return { title: 'Willkommen bei Mitschrift', content: JSON.stringify(doc) };
}
