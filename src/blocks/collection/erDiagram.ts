import type { CollectionRef } from './registry';
import type { Field, Sheet } from './model';

/** Mermaid-Bezeichner: nur Buchstaben/Ziffern/Unterstrich, darf nicht mit Ziffer beginnen. */
function safeIdent(name: string, fallback: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const withPrefix = /^[0-9]/.test(cleaned) ? `t_${cleaned}` : cleaned;
  return withPrefix || fallback;
}

/** Mermaid-erDiagram unterstützt keine echten Leerzeichen im Label – Anführungszeichen escapen reicht. */
function label(name: string): string {
  return `"${name.replace(/"/g, "'").trim() || 'Unbenannt'}"`;
}

const erFieldType = (f: Field): string => {
  switch (f.type) {
    case 'number':
      return 'number';
    case 'checkbox':
      return 'boolean';
    case 'date':
      return 'date';
    default:
      return 'string';
  }
};

interface SheetNode {
  key: string;
  collectionId: string;
  sheetId: string;
  ident: string;
  sheet: Sheet;
}

/**
 * Erzeugt Mermaid-`erDiagram`-Code aus allen Tabellen-Sammlungen im Dokument: je Tabellenblatt
 * eine Entität mit ihren Feldern, je Verknüpfungsfeld eine Beziehungslinie (Fremdschlüssel).
 * `onlyRelations`: schlankeres Diagramm ohne Felder, nur Entitäten + Beziehungen.
 */
export function generateErDiagram(collections: CollectionRef[], onlyRelations = false): string {
  const nodes: SheetNode[] = [];
  const usedIdents = new Set<string>();
  for (const c of collections)
    for (const s of c.data.sheets) {
      let ident = safeIdent(`${c.data.title}_${s.name}`, `blatt_${nodes.length + 1}`);
      let n = 2;
      while (usedIdents.has(ident)) ident = `${ident}_${n++}`;
      usedIdents.add(ident);
      nodes.push({ key: `${c.data.id}:${s.id}`, collectionId: c.data.id, sheetId: s.id, ident, sheet: s });
    }

  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const lines: string[] = ['erDiagram'];

  for (const n of nodes) {
    const attrFields = onlyRelations ? [] : n.sheet.fields.filter((f) => f.type !== 'relation');
    if (attrFields.length === 0) {
      lines.push(`  ${n.ident} {\n  }`);
      continue;
    }
    lines.push(`  ${n.ident} {`);
    for (const f of attrFields) lines.push(`    ${erFieldType(f)} ${safeIdent(f.name, 'feld')}`);
    lines.push(`  }`);
  }

  const seenRel = new Set<string>();
  for (const n of nodes)
    for (const f of n.sheet.fields) {
      if (f.type !== 'relation' || !f.relation) continue;
      const target = byKey.get(`${f.relation.collectionId}:${f.relation.sheetId}`);
      if (!target) continue;
      const relKey = `${n.ident}|${target.ident}|${f.id}`;
      if (seenRel.has(relKey)) continue;
      seenRel.add(relKey);
      // "genau eins zu null-oder-mehr" (||--o{) ist eine vernünftige Annahme für Fremdschlüssel;
      // bei Mehrfachverknüpfung (relationMulti) auf beiden Seiten optional-viele (}o--o{).
      const verb = f.relationMulti ? '}o--o{' : '}o--||';
      lines.push(`  ${n.ident} ${verb} ${target.ident} : ${label(f.name)}`);
    }

  return lines.join('\n');
}
