import type { Note, NotePatch } from '@/storage';
import type { IconName } from '@/ui/Icon';

/** Vorlage für eine neue Notiz: mitgelieferte Gerüste und eigene Notizen, die als Vorlage markiert sind. */
export interface NoteTemplate {
  id: string;
  name: string;
  hint: string;
  icon: IconName;
  /** Startwerte der neuen Notiz (Titel bleibt leer, damit man ihn gleich tippt). */
  init: () => NotePatch;
}

type J = Record<string, unknown>;
const text = (t: string): J => ({ type: 'text', text: t });
const p = (t = ''): J => (t ? { type: 'paragraph', content: [text(t)] } : { type: 'paragraph' });
const h2 = (t: string): J => ({ type: 'heading', attrs: { level: 2 }, content: [text(t)] });
const bullets = (...items: string[]): J => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [p(i)] })) });
const tasks = (...items: string[]): J => ({ type: 'taskList', content: items.map((i) => ({ type: 'taskItem', attrs: { checked: false }, content: [p(i)] })) });
const callout = (variant: string, ...content: J[]): J => ({ type: 'callout', attrs: { variant }, content });
const columns = (...cols: J[][]): J => ({ type: 'columns', content: cols.map((content) => ({ type: 'column', content })) });
const doc = (...content: J[]) => JSON.stringify({ type: 'doc', content });
const id = () => Math.random().toString(36).slice(2, 10);

/** Sammlung „Themen“ mit Status-Board – jede Vorlage bekommt eigene IDs. */
function topicsCollection(): J {
  const [title, status, date, open, busy, done] = [id(), id(), id(), id(), id(), id()];
  const row = (name: string) => ({ id: id(), cells: { [title]: name, [status]: open } });
  return {
    type: 'collection',
    attrs: {
      data: {
        id: id(),
        title: 'Themen',
        sheets: [
          {
            id: id(),
            name: 'Themen',
            fields: [
              { id: title, name: 'Thema', type: 'text' },
              {
                id: status,
                name: 'Status',
                type: 'select',
                options: [
                  { id: open, label: 'Offen', color: 'graphite' },
                  { id: busy, label: 'Lerne ich gerade', color: 'amber' },
                  { id: done, label: 'Sitzt', color: 'green' },
                ],
              },
              { id: date, name: 'Wiederholen am', type: 'date' },
            ],
            rows: [row('Thema 1'), row('Thema 2'), row('Thema 3')],
            views: [
              { id: id(), name: 'Board', type: 'board', groupBy: status, filters: [] },
              { id: id(), name: 'Tabelle', type: 'table', filters: [] },
              { id: id(), name: 'Kalender', type: 'calendar', dateFieldId: date, filters: [] },
            ],
          },
        ],
      },
    },
  };
}

export const builtinTemplates: NoteTemplate[] = [
  {
    id: 'mitschrift',
    name: 'Unterrichts-Mitschrift',
    hint: 'Thema, Kernaussagen, offene Fragen',
    icon: 'note',
    init: () => ({
      content: doc(
        { type: 'toc' },
        h2('Thema'),
        p(),
        h2('Kernaussagen'),
        bullets(''),
        callout('important', p('Das Wichtigste in einem Satz.')),
        h2('Offene Fragen'),
        tasks(''),
        h2('Zusammenfassung'),
        p(),
      ),
    }),
  },
  {
    id: 'klausur',
    name: 'Klausur-Vorbereitung',
    hint: 'Themen-Board, Lernplan, Stolpersteine',
    icon: 'target',
    init: () => ({
      content: doc(
        p('Termin, Raum, erlaubte Hilfsmittel:'),
        h2('Themen'),
        topicsCollection(),
        h2('Lernplan'),
        tasks('Stoff sichten und Themen eintragen', 'Karteikarten anlegen', 'Altklausur unter Zeit rechnen'),
        h2('Stolpersteine'),
        callout('warning', p('Was geht immer wieder schief?')),
      ),
    }),
  },
  {
    id: 'projekt',
    name: 'Projekt / Gruppenarbeit',
    hint: 'Ziel und Beteiligte nebeneinander, Aufgaben',
    icon: 'steps',
    init: () => ({
      content: doc(
        columns([h2('Ziel'), p('Was soll am Ende stehen?')], [h2('Beteiligte'), bullets('')]),
        h2('Aufgaben'),
        tasks(''),
        h2('Notizen'),
        p(),
      ),
    }),
  },
  {
    id: 'cornell',
    name: 'Cornell-Notizen',
    hint: 'Stichworte links, Notizen rechts, Fazit unten',
    icon: 'layoutGrid',
    init: () => ({
      content: doc(
        { type: 'columns', attrs: { layout: 'wide-right' }, content: [{ type: 'column', content: [h2('Stichworte'), bullets('')] }, { type: 'column', content: [h2('Notizen'), p()] }] },
        h2('Zusammenfassung'),
        p(),
      ),
    }),
  },
];

/** Eigene Vorlagen: Notizen mit gesetztem Vorlagen-Schalter. Neue Notizen übernehmen Inhalt und Fächer. */
export function userTemplates(notes: Note[]): NoteTemplate[] {
  return notes
    .filter((n) => n.template)
    .map((n) => ({
      id: `note:${n.id}`,
      name: n.title || 'Ohne Titel',
      hint: 'Eigene Vorlage',
      icon: 'file' as IconName,
      init: () => ({ content: n.content, tags: n.tags }),
    }));
}
