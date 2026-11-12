import { toMarkdown } from '@/export/text';
import type { Note, Tag } from '../types';

/**
 * Lesbarer Markdown-Spiegel einer Notiz: Frontmatter + Inhalt über den vorhandenen Markdown-Export.
 * Er dient zum Lesen und Durchsuchen in anderen Programmen (Finder, Obsidian, Editor) und wird
 * nie zurückgelesen – maßgeblich ist immer die `.mitschrift.json` daneben.
 */
export async function buildMirror(
  note: Note,
  ctx: { tags: Tag[]; files: { id: string; path: string }[]; sourceName: string },
): Promise<string> {
  const doc = note.content ? JSON.parse(note.content) : { type: 'doc', content: [] };
  const tagNames = note.tags.map((id) => ctx.tags.find((t) => t.id === id)?.name).filter((n): n is string => !!n);
  // Lokale Bilder (`file:<id>`) zeigen im Spiegel auf die Datei in „Anhänge/“.
  const images = new Map(ctx.files.map((f) => [`file:${f.id}`, { url: f.path.split('/').map(encodeURIComponent).join('/'), width: 0, height: 0 }]));
  const body = toMarkdown({ title: note.title, tags: tagNames, doc, assets: { images, mermaid: new Map(), math: new Map() } });

  const q = (s: string) => JSON.stringify(s); // JSON-Strings sind gültiges YAML
  const front = [
    '---',
    `title: ${q(note.title)}`,
    `mitschrift-id: ${q(note.id)}`,
    tagNames.length ? `tags: [${tagNames.map(q).join(', ')}]` : 'tags: []',
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
    ...(note.parentId ? [`parent: ${q(note.parentId)}`] : []),
    `source: ${q(ctx.sourceName)}`,
    '---',
    '',
    `<!-- Automatisch erzeugt aus „${ctx.sourceName}“. Änderungen an dieser Datei übernimmt Mitschrift nicht. -->`,
    '',
  ].join('\n');
  return front + body;
}
