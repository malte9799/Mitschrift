import type { DebugDoc } from '../debugDocs';

const t = (text: string) => ({ type: 'text', text });
const fn = (text: string) => ({ type: 'footnote', attrs: { text } });

/** Gemeinsamer Fußbereich: Fußnoten neben Unterseiten und Rückverweisen unter einer Linie. */
const doc: DebugDoc = {
  key: 'footnotes-footer',
  title: 'Debug: Fußnoten & Unterseiten-Footer',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [t('Unter der Notiz stehen Unterseiten, „Verlinkt von“ und Fußnoten nebeneinander unter einer gemeinsamen Linie – nicht als zwei getrennte Footer.')] },
      {
        type: 'paragraph',
        content: [
          t('Die Mitochondrien sind das Kraftwerk der Zelle'),
          fn('Lehrbuch Biologie, Kap. 3'),
          t('. Die DNA liegt im Zellkern'),
          fn('Außer bei Prokaryoten.'),
          t(' und wird bei der Mitose verdoppelt'),
          fn(''),
          t('.'),
        ],
      },
      { type: 'paragraph', content: [t('Zum Testen: „Neue Unterseite“ im Footer anlegen, Fußnote im Footer anklicken (springt zur Stelle), Lernmodus (leere Gruppen verschwinden), schmales Fenster (Gruppen brechen um).')] },
    ],
  },
};

export default doc;
