import type { TagColor } from '@/storage';
import { runFormula, formatNumber, type FormulaValue } from './formula';
import { cellText, isChoiceType, isComputedType, rowTitle, sortRows, uid, type CellValue, type CollectionData, type Field, type Filter, type FilterOp, type Row, type Sheet, type View } from './model';

/** Zugriff auf alle Sammlungen, die für Verknüpfungen und Rollups erreichbar sind (die des Dokuments). */
export type Collections = CollectionData[];

export function resolveSheet(all: Collections, collectionId: string, sheetId: string): Sheet | undefined {
  return all.find((c) => c.id === collectionId)?.sheets.find((s) => s.id === sheetId);
}

// Formeln und Rollups können aufeinander verweisen – ab dieser Tiefe gilt es als Kreis.
const MAX_DEPTH = 6;

/** Verknüpfte Zeilen-IDs einer Zelle. */
const relationIds = (value: CellValue): string[] => (Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []);

/** Wert für Formeln: Auswahl als Label, Verknüpfung als Titel, alles andere unverändert. */
function formulaInput(field: Field, row: Row, sheet: Sheet, all: Collections, depth: number): FormulaValue {
  const value = cellValue(field, row, sheet, all, depth);
  if (value === null || value === undefined) return null;
  if (field.type === 'relation') return cellText(field, value, relationTitles(field, all)) || null;
  if (isChoiceType(field.type)) return cellText(field, value) || null;
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

/** Zeilen-ID → Titel im Zielblatt eines Verknüpfungsfeldes. */
export function relationTitles(field: Field, all: Collections): ((rowId: string) => string | null) | undefined {
  const target = field.relation && resolveSheet(all, field.relation.collectionId, field.relation.sheetId);
  if (!target) return undefined;
  return (rowId) => {
    const row = target.rows.find((r) => r.id === rowId);
    return row ? rowTitle(target, row) : null;
  };
}

function rollup(field: Field, row: Row, sheet: Sheet, all: Collections, depth: number): CellValue {
  const cfg = field.rollup;
  const relField = cfg && sheet.fields.find((f) => f.id === cfg.relationFieldId && f.type === 'relation');
  const target = relField?.relation && resolveSheet(all, relField.relation.collectionId, relField.relation.sheetId);
  if (!cfg || !relField || !target) return null;
  const ids = relationIds(row.cells[relField.id] ?? null);
  const rows = ids.map((id) => target.rows.find((r) => r.id === id)).filter((r): r is Row => !!r);
  if (cfg.fn === 'count') return rows.length;
  const targetField = target.fields.find((f) => f.id === cfg.targetFieldId);
  if (!targetField) return null;
  const values = rows.map((r) => formulaInput(targetField, r, target, all, depth + 1));
  if (cfg.fn === 'list') return values.filter((v) => v !== null && v !== '').map((v) => (typeof v === 'number' ? formatNumber(v) : typeof v === 'boolean' ? (v ? 'Ja' : 'Nein') : v)).join(', ') || null;
  if (cfg.fn === 'percentChecked') return rows.length ? Math.round((values.filter((v) => v === true).length / rows.length) * 100) : null;
  const nums = values.filter((v) => v !== null && v !== '').map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  switch (cfg.fn) {
    case 'sum':
      return nums.reduce((s, n) => s + n, 0);
    case 'avg':
      return nums.reduce((s, n) => s + n, 0) / nums.length;
    case 'min':
      return Math.min(...nums);
    case 'max':
      return Math.max(...nums);
  }
}

/** Zellwert einer Zeile – gespeichert, oder für Formel/Rollup berechnet. */
export function cellValue(field: Field, row: Row, sheet: Sheet, all: Collections, depth = 0): CellValue {
  if (!isComputedType(field.type)) return row.cells[field.id] ?? null;
  if (depth > MAX_DEPTH) return null;
  if (field.type === 'rollup') return rollup(field, row, sheet, all, depth);
  return runFormula(field.formula ?? '', (name) => {
    const ref = sheet.fields.find((f) => f.name.trim().toLowerCase() === name.toLowerCase());
    return ref && ref.id !== field.id ? formulaInput(ref, row, sheet, all, depth + 1) : null;
  });
}

/** Zellwert als Anzeigetext, auch für berechnete Felder und Verknüpfungen. */
export function displayText(field: Field, row: Row, sheet: Sheet, all: Collections): string {
  const value = cellValue(field, row, sheet, all);
  if (value === null || value === undefined) return '';
  if (isComputedType(field.type)) return typeof value === 'number' ? formatNumber(value) : typeof value === 'boolean' ? (value ? 'Ja' : 'Nein') : String(value);
  if (field.type === 'number' && typeof value === 'number') return value.toLocaleString('de-DE');
  if (field.type === 'date' && typeof value === 'string') return formatDate(value);
  return cellText(field, value, relationTitles(field, all));
}

export function formatDate(v: string): string {
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Filter -------------------------------------------------------------------------------------

const opLabels: Record<FilterOp, string> = {
  contains: 'enthält',
  notContains: 'enthält nicht',
  is: 'ist',
  isNot: 'ist nicht',
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  before: 'vor',
  after: 'nach',
  checked: 'ist abgehakt',
  unchecked: 'ist nicht abgehakt',
  empty: 'ist leer',
  notEmpty: 'ist nicht leer',
};
export const filterOpLabel = (op: FilterOp) => opLabels[op];
export const opNeedsValue = (op: FilterOp) => !['checked', 'unchecked', 'empty', 'notEmpty'].includes(op);

/** Welche Vergleiche ein Feldtyp anbietet. */
export function filterOps(field: Field): FilterOp[] {
  switch (field.type) {
    case 'checkbox':
      return ['checked', 'unchecked'];
    case 'number':
      return ['is', 'isNot', 'gt', 'lt', 'gte', 'lte', 'empty', 'notEmpty'];
    case 'date':
      return ['is', 'before', 'after', 'empty', 'notEmpty'];
    case 'select':
    case 'multiselect':
      return ['is', 'isNot', 'empty', 'notEmpty'];
    case 'formula':
    case 'rollup':
      return ['contains', 'is', 'isNot', 'gt', 'lt', 'gte', 'lte', 'empty', 'notEmpty'];
    default:
      return ['contains', 'notContains', 'is', 'isNot', 'empty', 'notEmpty'];
  }
}

export function newFilter(field: Field): Filter {
  return { id: uid(), fieldId: field.id, op: filterOps(field)[0], value: '' };
}

function matches(filter: Filter, field: Field, row: Row, sheet: Sheet, all: Collections): boolean {
  const value = cellValue(field, row, sheet, all);
  const isEmpty = value === null || value === undefined || value === '' || value === false || (Array.isArray(value) && value.length === 0);
  const want = (filter.value ?? '').trim();
  switch (filter.op) {
    case 'empty':
      return isEmpty;
    case 'notEmpty':
      return !isEmpty;
    case 'checked':
      return value === true;
    case 'unchecked':
      return value !== true;
  }
  // Ohne Vergleichswert filtert die Bedingung noch nicht (sie wird gerade erst angelegt).
  if (!want) return true;
  if (isChoiceType(field.type)) {
    const has = relationIds(value).includes(want);
    return filter.op === 'isNot' ? !has : has;
  }
  const text = displayText(field, row, sheet, all).toLowerCase();
  const raw = typeof value === 'number' ? value : field.type === 'date' ? String(value ?? '') : text;
  switch (filter.op) {
    case 'contains':
      return text.includes(want.toLowerCase());
    case 'notContains':
      return !text.includes(want.toLowerCase());
    case 'is':
      return typeof raw === 'number' ? raw === Number(want.replace(',', '.')) : raw === want.toLowerCase() || text === want.toLowerCase();
    case 'isNot':
      return typeof raw === 'number' ? raw !== Number(want.replace(',', '.')) : raw !== want.toLowerCase() && text !== want.toLowerCase();
    case 'before':
      return !isEmpty && String(raw) < want;
    case 'after':
      return !isEmpty && String(raw) > want;
    default: {
      if (isEmpty) return false;
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
      const w = Number(want.replace(',', '.'));
      if (!Number.isFinite(n) || !Number.isFinite(w)) return false;
      return filter.op === 'gt' ? n > w : filter.op === 'lt' ? n < w : filter.op === 'gte' ? n >= w : n <= w;
    }
  }
}

/** Zeilen einer Ansicht: gefiltert (alle Bedingungen müssen zutreffen) und sortiert. */
export function viewRows(sheet: Sheet, view: View, all: Collections): Row[] {
  const filters = (view.filters ?? []).map((f) => ({ f, field: sheet.fields.find((x) => x.id === f.fieldId) })).filter((x): x is { f: Filter; field: Field } => !!x.field);
  const rows = filters.length ? sheet.rows.filter((row) => filters.every(({ f, field }) => matches(f, field, row, sheet, all))) : sheet.rows;
  return sortRows(sheet, rows, view.sort, (field, row) => cellValue(field, row, sheet, all));
}

/** Startwerte für eine neue Zeile, damit sie in der gefilterten Ansicht nicht sofort verschwindet. */
export function rowDefaults(sheet: Sheet, view: View): Record<string, CellValue> {
  const cells: Record<string, CellValue> = {};
  for (const f of view.filters ?? []) {
    const field = sheet.fields.find((x) => x.id === f.fieldId);
    if (!field) continue;
    if (field.type === 'checkbox' && f.op === 'checked') cells[field.id] = true;
    else if (f.op === 'is' && f.value) {
      if (field.type === 'select') cells[field.id] = f.value;
      else if (field.type === 'multiselect') cells[field.id] = [f.value];
      else if (field.type === 'date' || field.type === 'text') cells[field.id] = f.value;
    }
  }
  return cells;
}

// --- Gruppen ------------------------------------------------------------------------------------

export interface RowGroup {
  /** Options-ID, „true“/„false“ oder der Text; `''` für Zeilen ohne Wert. */
  key: string;
  label: string;
  color?: TagColor;
  rows: Row[];
}

/** Zellwert, den eine Zeile bekommt, wenn sie in die Gruppe `key` gelegt wird (`undefined`: nicht setzbar). */
export function groupCellValue(field: Field, key: string): CellValue | undefined {
  if (isComputedType(field.type) || field.type === 'relation') return undefined;
  if (key === '') return field.type === 'checkbox' ? false : null;
  switch (field.type) {
    case 'select':
      return key;
    case 'multiselect':
      return [key];
    case 'checkbox':
      return key === 'true';
    case 'number':
      return Number(key);
    default:
      return key;
  }
}

/** Zeilen nach einem Feld gruppieren. Auswahlfelder behalten die Reihenfolge ihrer Optionen (auch leere Gruppen). */
export function groupRows(sheet: Sheet, rows: Row[], field: Field, all: Collections): RowGroup[] {
  const groups = new Map<string, RowGroup>();
  const group = (key: string, label: string, color?: TagColor) => {
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, label, color, rows: [] }));
    return g;
  };
  if (isChoiceType(field.type)) for (const o of field.options ?? []) group(o.id, o.label, o.color);
  if (field.type === 'checkbox') {
    group('true', 'Abgehakt');
    group('false', 'Offen');
  }
  for (const row of rows) {
    const value = cellValue(field, row, sheet, all);
    if (isChoiceType(field.type)) {
      // Bei Mehrfachauswahl zählt die erste Option – sonst stünde die Zeile mehrfach in der Ansicht.
      const id = relationIds(value).find((x) => groups.has(x));
      (id ? groups.get(id)! : group('', `Ohne ${field.name}`)).rows.push(row);
    } else if (field.type === 'checkbox') {
      groups.get(value === true ? 'true' : 'false')!.rows.push(row);
    } else {
      const text = displayText(field, row, sheet, all);
      const key = field.type === 'date' || field.type === 'number' ? String(value ?? '') : text;
      group(text ? key : '', text || `Ohne ${field.name}`).rows.push(row);
    }
  }
  const list = [...groups.values()];
  // Freie Werte alphabetisch; die Gruppe ohne Wert immer ans Ende.
  if (!isChoiceType(field.type) && field.type !== 'checkbox') list.sort((a, b) => a.key.localeCompare(b.key, 'de', { numeric: true }));
  return [...list.filter((g) => g.key !== ''), ...list.filter((g) => g.key === '')];
}
