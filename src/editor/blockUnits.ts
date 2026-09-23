import { Fragment, type Node as PMNode, type NodeType } from '@tiptap/pm/model';
import { Selection, type Transaction } from '@tiptap/pm/state';
import { canJoin } from '@tiptap/pm/transform';
import type { EditorView } from '@tiptap/pm/view';

/**
 * „Block-Einheiten“ für Griff, Auswahl und Verschieben: jeder Block auf oberster Ebene –
 * außer Listen, dort ist jeder Listenpunkt (auch verschachtelt) eine eigene Einheit.
 */

const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList']);
/** Container-Blöcke, deren Inhalt aus eigenen Einheiten besteht (wie Unterpunkte einer Liste). */
const CONTAINER_TYPES = new Set(['toggleBlock']);
const ITEM_TYPES = new Set(['listItem', 'taskItem']);

export interface BlockUnit {
  pos: number;
  node: PMNode;
  /** Verschachtelungstiefe innerhalb von Listen (0 = oberste Ebene). */
  depth: number;
  /** Position der umgebenden Liste bzw. -1 auf oberster Ebene. */
  listPos: number;
}

export const isListItem = (node: PMNode) => ITEM_TYPES.has(node.type.name);

/** Alle Einheiten in Dokument-Reihenfolge (Eltern vor ihren verschachtelten Punkten). */
export function blockUnits(doc: PMNode): BlockUnit[] {
  const out: BlockUnit[] = [];
  const visitList = (list: PMNode, listPos: number, depth: number) => {
    list.forEach((item, off) => {
      const pos = listPos + 1 + off;
      out.push({ pos, node: item, depth, listPos });
      item.forEach((child, childOff) => {
        if (LIST_TYPES.has(child.type.name)) visitList(child, pos + 1 + childOff, depth + 1);
      });
    });
  };
  const visitBlock = (node: PMNode, pos: number, depth: number) => {
    if (LIST_TYPES.has(node.type.name)) return visitList(node, pos, depth);
    out.push({ pos, node, depth, listPos: -1 });
    // Toggle: Titelzeile ist die Einheit, jeder Block im Inhalt eine eigene.
    if (CONTAINER_TYPES.has(node.type.name)) node.forEach((child, off) => visitBlock(child, pos + 1 + off, depth + 1));
  };
  doc.forEach((node, off) => visitBlock(node, off, 0));
  return out;
}

/** Innerste Einheit, die Dokument-Position `pos` enthält. */
export function unitAt(doc: PMNode, pos: number): BlockUnit | null {
  let found: BlockUnit | null = null;
  for (const u of blockUnits(doc)) {
    if (u.pos <= pos && pos < u.pos + u.node.nodeSize) found = u;
  }
  return found;
}

/** Positionen samt aller verschachtelten Unterpunkte – Eltern und Kinder gehören zusammen. */
export function withDescendants(doc: PMNode, positions: number[]): number[] {
  const units = blockUnits(doc);
  const set = new Set<number>();
  for (const p of positions) {
    const u = units.find((x) => x.pos === p);
    if (!u) continue;
    for (const x of units) if (x.pos >= u.pos && x.pos < u.pos + u.node.nodeSize) set.add(x.pos);
  }
  return [...set].sort((a, b) => a - b);
}

/** Nur die äußersten Einheiten – Unterpunkte markierter Eltern wandern ohnehin mit. */
export function outermost(doc: PMNode, positions: number[]): BlockUnit[] {
  const units = blockUnits(doc).filter((u) => positions.includes(u.pos));
  return units.filter((u) => !units.some((p) => p !== u && p.pos < u.pos && u.pos < p.pos + p.node.nodeSize));
}

/** Anzahl eigenständig markierter Blöcke – mitmarkierte Unterpunkte zählen nicht. */
export function outermostCount(doc: PMNode, positions: number[]): number {
  return outermost(doc, positions).length;
}

/**
 * Eigene Fläche einer Einheit auf dem Bildschirm: bei Listenpunkten ohne die
 * verschachtelten Unterpunkte (die sind eigene Einheiten).
 */
export function unitRect(view: EditorView, pos: number): DOMRect | null {
  const el = view.nodeDOM(pos);
  if (!(el instanceof HTMLElement)) return null;
  // In einem eingeklappten Toggle: unsichtbar (nur abgeschnitten, nicht Höhe 0) – keine Fläche.
  if (el.closest('.b-toggle:not(.is-open) .b-toggle-body')) return null;
  const r = el.getBoundingClientRect();
  // Toggle: nur die Titelzeile, der Inhalt besteht aus eigenen Einheiten.
  const head = el.querySelector(':scope .b-toggle-head');
  if (head && el.matches('.node-toggleBlock')) return new DOMRect(r.left, r.top, r.width, head.getBoundingClientRect().bottom - r.top);
  if (el.tagName !== 'LI') return r;
  const nested = el.querySelector(':scope > ul, :scope > ol, :scope > div > ul, :scope > div > ol');
  if (!nested) return r;
  return new DOMRect(r.left, r.top, r.width, nested.getBoundingClientRect().top - r.top);
}

/** Löscht die Einheiten; leer gewordene Listen verschwinden mit (deleteRange). */
export function deleteUnits(tr: Transaction, positions: number[]) {
  const units = outermost(tr.doc, positions).sort((a, b) => b.pos - a.pos);
  for (const u of units) {
    const from = tr.mapping.map(u.pos);
    tr.deleteRange(from, from + u.node.nodeSize);
  }
  return tr;
}

/** Wandelt einen Knoten so um, dass er in `itemType` (Liste) bzw. auf oberste Ebene passt. */
function fitNode(node: PMNode, sourceList: NodeType | null, itemType: NodeType | null): PMNode[] | null {
  const schema = node.type.schema;
  if (itemType) {
    if (isListItem(node)) {
      if (node.type === itemType) return [node];
      // Aufzählung ↔ Checkliste: Inhalt behalten, Punkt-Typ tauschen.
      return [itemType.create(itemType.name === 'taskItem' ? { checked: false } : null, node.content)];
    }
    if (node.type === schema.nodes.paragraph) return [itemType.create(itemType.name === 'taskItem' ? { checked: false } : null, node)];
    return null; // Andere Blöcke (Quiz, Tabelle …) passen nicht in eine Liste.
  }
  // Oberste Ebene: Listenpunkt bleibt Listenpunkt – in einer eigenen Liste seines Typs.
  if (isListItem(node)) return [(sourceList ?? schema.nodes.bulletList).create(null, node)];
  return [node];
}

/**
 * Verschiebt Einheiten vor/hinter die Ziel-Einheit. Listenpunkte bleiben Listenpunkte,
 * Absätze werden in Listen zu Punkten, benachbarte Listen gleichen Typs verschmelzen.
 */
export function moveUnits(tr: Transaction, positions: number[], targetPos: number, before: boolean): boolean {
  const doc = tr.doc;
  const units = outermost(doc, positions).sort((a, b) => a.pos - b.pos);
  const target = blockUnits(doc).find((u) => u.pos === targetPos);
  if (!units.length || !target) return false;
  // Nicht in sich selbst bzw. in eigene Unterpunkte ziehen.
  if (units.some((u) => targetPos >= u.pos && targetPos < u.pos + u.node.nodeSize)) return false;

  const targetList = target.listPos >= 0 ? doc.nodeAt(target.listPos) : null;
  const itemType = targetList ? (targetList.type.name === 'taskList' ? doc.type.schema.nodes.taskItem : doc.type.schema.nodes.listItem) : null;

  let nodes: PMNode[] = [];
  let fitsList = true;
  for (const u of units) {
    const sourceList = u.listPos >= 0 ? doc.nodeAt(u.listPos)?.type ?? null : null;
    const fitted = fitNode(u.node, sourceList, itemType);
    if (!fitted) fitsList = false;
    else nodes.push(...fitted);
  }

  let insertAt = before ? target.pos : target.pos + target.node.nodeSize;
  if (itemType && !fitsList) {
    // Passt nicht in die Liste: hinter die ganze (äußerste) Liste auf oberste Ebene.
    const top = doc.resolve(target.pos);
    insertAt = top.after(1);
    nodes = units.flatMap((u) => fitNode(u.node, u.listPos >= 0 ? doc.nodeAt(u.listPos)?.type ?? null : null, null) ?? []);
  }

  deleteUnits(tr, positions);
  const at = tr.mapping.map(insertAt, before ? -1 : 1);
  const fragment = Fragment.from(nodes);
  tr.insert(at, fragment);

  // Angrenzende Listen gleichen Typs zusammenführen (erst hinten, dann vorne) – nur Listen,
  // niemals die Listenpunkte selbst.
  joinLists(tr, at + fragment.size);
  joinLists(tr, at);
  return true;
}

function joinLists(tr: Transaction, pos: number) {
  if (pos <= 0 || pos >= tr.doc.content.size) return;
  const $pos = tr.doc.resolve(pos);
  const before = $pos.nodeBefore;
  const after = $pos.nodeAfter;
  if (before && after && before.type === after.type && LIST_TYPES.has(before.type.name) && canJoin(tr.doc, pos)) tr.join(pos);
}

/** Cursor ans Ende des ersten Textes der Einheit. */
export function caretAtUnitEnd(doc: PMNode, pos: number): Selection | null {
  const sel = Selection.findFrom(doc.resolve(pos + 1), 1, true);
  if (!sel || !sel.$from.parent.isTextblock) return null;
  return Selection.near(doc.resolve(sel.$from.end()), -1);
}
