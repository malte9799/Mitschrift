import type { Note } from '@/storage';

interface JsonNode {
  type?: string;
  text?: string;
  content?: JsonNode[];
}

/**
 * Reiner Text einer Notiz für Suche und Vorschau. Text innerhalb eines Absatzes wird direkt
 * aneinandergehängt („Hal**lo**“ bleibt „Hallo“), Blöcke werden durch Leerzeichen getrennt.
 */
function extract(content: string): string {
  if (!content) return '';
  let doc: JsonNode;
  try {
    doc = JSON.parse(content) as JsonNode;
  } catch {
    return content; // kein JSON (z. B. von Hand bearbeitet) – als Text nehmen
  }
  const parts: string[] = [];
  const walk = (n: JsonNode) => {
    if (n.text) parts.push(n.text);
    if (n.content) {
      n.content.forEach(walk);
      parts.push(' ');
    }
  };
  walk(doc);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Je Notizstand nur einmal parsen; die Grenze hält den Speicher bei vielen Änderungen klein. */
const cache = new Map<string, string>();
const MAX = 2000;

export function noteText(note: Pick<Note, 'id' | 'updatedAt' | 'content'>): string {
  const key = `${note.id}:${note.updatedAt}:${note.content.length}`;
  let text = cache.get(key);
  if (text === undefined) {
    text = extract(note.content);
    if (cache.size >= MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, text);
  }
  return text;
}
