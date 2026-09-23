import type { DebugDoc } from '../debugDocs';

const t = (text: string, ...marks: string[]) => ({ type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: object[]) => ({ type: 'paragraph', content });
const h = (level: number, text: string) => ({ type: 'heading', attrs: { level }, content: [t(text)] });
const li = (text: string, ...children: object[]) => ({ type: 'listItem', content: [p(t(text)), ...children] });
const task = (text: string, checked: boolean) => ({ type: 'taskItem', attrs: { checked }, content: [p(t(text))] });
const cell = (type: 'tableHeader' | 'tableCell', text: string) => ({ type, content: [p(t(text))] });

/** Was beim Einfügen von Markdown entstehen soll (Test aus dem Markdown-Zwischenablage-Chat). */
const doc: DebugDoc = {
  key: 'markdown-formatierung',
  title: 'Debug: Markdown & Formatierung',
  doc: {
    type: 'doc',
    content: [
      h(1, 'Überschrift 1'),
      h(2, 'Überschrift 2'),
      h(3, 'Überschrift 3'),
      p(
        t('Text mit '),
        t('fett', 'bold'),
        t(', '),
        t('kursiv', 'italic'),
        t(', '),
        t('unterstrichen', 'underline'),
        t(', '),
        t('durchgestrichen', 'strike'),
        t(', '),
        t('code', 'code'),
        t(' und einem '),
        { type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
        t('.'),
      ),
      { type: 'bulletList', content: [li('Punkt A', { type: 'bulletList', content: [li('Unterpunkt')] }), li('Punkt B')] },
      { type: 'orderedList', content: [li('Eins'), li('Zwei'), li('Drei')] },
      { type: 'taskList', content: [task('offen', false), task('erledigt', true)] },
      { type: 'blockquote', content: [p(t('Ein Zitat.'))] },
      { type: 'callout', attrs: { variant: 'warning' }, content: [p(t('Achtung hier (aus > [!WARNING]).'))] },
      { type: 'codeBlock', attrs: { language: 'javascript' }, content: [t('const a = 1;\nconsole.log(a);')] },
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', 'A'), cell('tableHeader', 'B')] },
          { type: 'tableRow', content: [cell('tableCell', '1'), cell('tableCell', '2')] },
        ],
      },
      { type: 'horizontalRule' },
      p(t('Zum Testen: diesen Markdown-Text kopieren und in eine leere Zeile einfügen:')),
      {
        type: 'codeBlock',
        attrs: { language: 'markdown' },
        content: [
          t(
            '## MD-Test\nText mit **fett**, *kursiv*, `code` und [Link](https://example.com).\n\n- Punkt A\n  - Unterpunkt\n1. Eins\n2. Zwei\n\n- [ ] offen\n- [x] erledigt\n\n> Zitat\n\n> [!WARNING]\n> Achtung hier\n\n```js\nconst a = 1;\nconsole.log(a);\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n---',
          ),
        ],
      },
    ],
  },
};
export default doc;
