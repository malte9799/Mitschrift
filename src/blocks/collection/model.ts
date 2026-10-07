import type { TagColor } from '@/storage';
import type { IconName } from '@/ui/Icon';

export type FieldType = 'text' | 'number' | 'checkbox' | 'date' | 'url' | 'email' | 'phone' | 'select' | 'multiselect' | 'relation' | 'formula' | 'rollup';

/** Wie ein Rollup die Werte der verknüpften Zeilen zusammenfasst. */
export type RollupFn = 'list' | 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentChecked';

export interface RollupConfig {
  /** Verknüpfungsfeld in diesem Blatt, dessen Zeilen zusammengefasst werden. */
  relationFieldId: string;
  /** Feld im Zielblatt, dessen Werte gelesen werden. */
  targetFieldId: string;
  fn: RollupFn;
}

export interface SelectOption {
  id: string;
  label: string;
  color: TagColor;
}

/** Ziel einer Verknüpfung: ein Tabellenblatt (in dieser oder einer anderen Sammlung im Dokument). */
export interface RelationTarget {
  collectionId: string;
  sheetId: string;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  /** Eigenes Symbol im Spaltenkopf; sonst das des Feldtyps. */
  icon?: IconName;
  /** Nur für Einzel-/Mehrfachauswahl. */
  options?: SelectOption[];
  /** Nur für Verknüpfung: Zielblatt und ob mehrere Zeilen wählbar sind. */
  relation?: RelationTarget;
  relationMulti?: boolean;
  /** Nur für Formel: Ausdruck wie `{Punkte} / {Maximum} * 100`. */
  formula?: string;
  /** Nur für Rollup. */
  rollup?: RollupConfig;
}

/** text/url/email/phone/date: string, number: number, checkbox: boolean, select: Options-ID, multiselect/relation: IDs. */
export type CellValue = string | number | boolean | string[] | null;

export interface Row {
  id: string;
  cells: Record<string, CellValue>;
  /** Eigene Notiz dieser Zeile („Zeile als Dokument“), sobald sie einmal geöffnet wurde. */
  noteId?: string;
}

export type Sort = { fieldId: string; dir: 'asc' | 'desc' };

export type ViewType = 'table' | 'board' | 'gallery' | 'list' | 'calendar';

export type FilterOp = 'contains' | 'notContains' | 'is' | 'isNot' | 'gt' | 'lt' | 'gte' | 'lte' | 'before' | 'after' | 'checked' | 'unchecked' | 'empty' | 'notEmpty';

export interface Filter {
  id: string;
  fieldId: string;
  op: FilterOp;
  /** Vergleichswert: Text, Zahl als Text, Datum „YYYY-MM-DD“ oder Options-ID. */
  value?: string;
}

/** Eine Ansicht auf ein Blatt: dieselben Zeilen, anders dargestellt, gefiltert, sortiert und gruppiert. */
export interface View {
  id: string;
  name: string;
  type: ViewType;
  sort?: Sort | null;
  filters?: Filter[];
  /** Feld, nach dem gruppiert wird (im Board: die Spalten). */
  groupBy?: string | null;
  /** Datumsfeld der Kalender-Ansicht. */
  dateFieldId?: string | null;
}

export interface Sheet {
  id: string;
  name: string;
  fields: Field[];
  rows: Row[];
  /** Ältere Sammlungen: Sortierung direkt am Blatt – wandert in die erste Ansicht. */
  sort?: Sort | null;
  views?: View[];
}

export interface CollectionData {
  /** Eindeutige ID der Sammlung – Ziel für Verknüpfungsfelder aus anderen Sammlungen. */
  id: string;
  title: string;
  sheets: Sheet[];
}

/** `group`: Trennlinie davor im Typ-Menü. */
export const fieldTypes: { type: FieldType; label: string; icon: IconName; group?: boolean }[] = [
  { type: 'text', label: 'Text', icon: 'fieldText' },
  { type: 'number', label: 'Nummer', icon: 'fieldNumber' },
  { type: 'checkbox', label: 'Checkbox', icon: 'checkbox' },
  { type: 'date', label: 'Datum', icon: 'calendar' },
  { type: 'url', label: 'URL', icon: 'link' },
  { type: 'email', label: 'E-Mail', icon: 'mail' },
  { type: 'phone', label: 'Telefon', icon: 'phone' },
  { type: 'select', label: 'Einzelauswahl', icon: 'fieldSelect', group: true },
  { type: 'multiselect', label: 'Mehrfachauswahl', icon: 'fieldMulti' },
  { type: 'relation', label: 'Verknüpfung', icon: 'fieldRelation', group: true },
  { type: 'rollup', label: 'Rollup', icon: 'bars' },
  { type: 'formula', label: 'Formel', icon: 'formula' },
];

/** Berechnete Felder haben keinen gespeicherten Zellwert und sind nicht editierbar. */
export const isComputedType = (t: FieldType) => t === 'formula' || t === 'rollup';

export const viewTypes: { type: ViewType; label: string; icon: IconName }[] = [
  { type: 'table', label: 'Tabelle', icon: 'table' },
  { type: 'board', label: 'Board', icon: 'cards' },
  { type: 'gallery', label: 'Galerie', icon: 'layoutGrid' },
  { type: 'list', label: 'Liste', icon: 'layoutList' },
  { type: 'calendar', label: 'Kalender', icon: 'calendar' },
];

export const rollupFns: { fn: RollupFn; label: string }[] = [
  { fn: 'list', label: 'Werte anzeigen' },
  { fn: 'count', label: 'Anzahl' },
  { fn: 'sum', label: 'Summe' },
  { fn: 'avg', label: 'Durchschnitt' },
  { fn: 'min', label: 'Minimum' },
  { fn: 'max', label: 'Maximum' },
  { fn: 'percentChecked', label: 'Prozent abgehakt' },
];

/** Ansichten eines Blatts; ältere Blätter ohne Ansichten bekommen eine Tabelle mit der bisherigen Sortierung. */
export function sheetViews(sheet: Sheet): View[] {
  return sheet.views?.length ? sheet.views : [{ id: 'default', name: 'Tabelle', type: 'table', sort: sheet.sort ?? null }];
}

export const fieldIcon = (type: FieldType): IconName => fieldTypes.find((f) => f.type === type)?.icon ?? 'fieldText';
export const fieldIconOf = (field: Pick<Field, 'type' | 'icon'>): IconName => field.icon ?? fieldIcon(field.type);
export const isChoiceType = (t: FieldType) => t === 'select' || t === 'multiselect';

export const uid = () => Math.random().toString(36).slice(2, 10);

const optionColors: TagColor[] = ['blue', 'green', 'amber', 'purple', 'red', 'teal', 'pink', 'orange', 'graphite'];
export const nextOptionColor = (options: SelectOption[]): TagColor => optionColors[options.length % optionColors.length];

const emptyRows = (n: number): Row[] => Array.from({ length: n }, () => ({ id: uid(), cells: {} }));

/** Ältere gespeicherte Sammlungen haben noch keine `id` (für Verknüpfungsfelder) – beim Laden ergänzen. */
export function migrateCollection(data: CollectionData): CollectionData {
  return data.id ? data : { ...data, id: uid() };
}

export function newSheet(name: string): Sheet {
  return { id: uid(), name, fields: [{ id: uid(), name: 'Titel', type: 'text' }], rows: emptyRows(3), sort: null };
}

/** Startinhalt: ein Blatt mit Titel, Status (Einzelauswahl) und Datum. */
export function sampleCollection(): CollectionData {
  const sheet = newSheet('Tabelle');
  sheet.fields.push(
    {
      id: uid(),
      name: 'Status',
      type: 'select',
      options: [
        { id: uid(), label: 'Offen', color: 'graphite' },
        { id: uid(), label: 'In Arbeit', color: 'amber' },
        { id: uid(), label: 'Erledigt', color: 'green' },
      ],
    },
    { id: uid(), name: 'Datum', type: 'date' },
  );
  return { id: uid(), title: 'Sammlung', sheets: [sheet] };
}

/** Titel (erstes Feld) einer Zeile – für die Anzeige in Verknüpfungs-Zellen. */
export function rowTitle(sheet: Sheet, row: Row): string {
  const titleField = sheet.fields[0];
  return (titleField && cellText(titleField, row.cells[titleField.id])) || '(ohne Titel)';
}

/** Zellwert als Klartext (Kopieren, Typwechsel). Für Verknüpfungen wird `resolveTitle` benutzt, falls angegeben. */
export function cellText(field: Field, value: CellValue, resolveTitle?: (rowId: string) => string | null): string {
  if (value === null || value === undefined) return '';
  if (field.type === 'relation' && resolveTitle) {
    const ids = Array.isArray(value) ? value : [value as string];
    return ids.map((id) => resolveTitle(id)).filter((s): s is string => !!s).join(', ');
  }
  if (Array.isArray(value)) return value.map((id) => field.options?.find((o) => o.id === id)?.label ?? '').filter(Boolean).join(', ');
  if (field.type === 'select') return field.options?.find((o) => o.id === value)?.label ?? '';
  if (typeof value === 'boolean') return value ? 'Ja' : '';
  return String(value);
}

/** Eingefügten Text in einen Zellwert des Feldtyps umwandeln (Auswahl nur über vorhandene Optionen). */
export function parseCell(field: Field, text: string): CellValue {
  const t = text.trim();
  if (!t) return null;
  const option = (label: string) => field.options?.find((o) => o.label.toLowerCase() === label.trim().toLowerCase())?.id;
  switch (field.type) {
    case 'number': {
      const n = Number(t.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    case 'checkbox':
      return /^(ja|yes|true|wahr|x|1|✓|✔)$/i.test(t);
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
    case 'select':
      return option(t) ?? null;
    case 'multiselect': {
      const ids = t.split(',').map(option).filter((id): id is string => !!id);
      return ids.length ? ids : null;
    }
    default:
      return t;
  }
}

/** Wert beim Wechsel des Feldtyps so gut wie möglich übernehmen. */
export function convertValue(value: CellValue, from: Field, to: FieldType): CellValue {
  if (value === null || value === undefined || value === '') return null;
  const asText = () => cellText(from, value);
  switch (to) {
    case 'number': {
      const n = Number(asText().replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    case 'checkbox':
      return typeof value === 'boolean' ? value : asText() !== '';
    case 'select':
    case 'multiselect':
      return null; // Optionen werden beim Typwechsel aus den Texten erzeugt (siehe changeFieldType).
    case 'relation':
      return null; // Verknüpfungen lassen sich nicht aus Text erzeugen – Zeile im Picker neu wählen.
    case 'formula':
    case 'rollup':
      return null; // Berechnete Felder speichern keinen Wert.
    default:
      return asText() || null;
  }
}

/** Ändert den Typ eines Feldes; bei Auswahl-Typen entstehen Optionen aus den bisherigen Texten. */
export function changeFieldType(sheet: Sheet, fieldId: string, type: FieldType): Sheet {
  const field = sheet.fields.find((f) => f.id === fieldId);
  if (!field || field.type === type) return sheet;
  const isChoice = (t: FieldType) => t === 'select' || t === 'multiselect';
  let options = field.options ?? [];
  const rows = sheet.rows.map((row) => {
    const value = row.cells[fieldId];
    let next: CellValue;
    if (type === 'relation' && field.type === 'relation') {
      // Ein-/Mehrfachverknüpfung wechseln: Werte einfach übernehmen (unten wird ggf. gekürzt).
      next = value;
    } else if (isChoice(type) && isChoice(field.type)) {
      // Einzel ↔ Mehrfach: Optionen bleiben, Wert wird Liste bzw. erster Eintrag.
      next = type === 'multiselect' ? (Array.isArray(value) ? value : value ? [value as string] : []) : Array.isArray(value) ? value[0] ?? null : value;
    } else if (isChoice(type)) {
      const labels = (convertValue(value, field, 'text') as string | null)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const ids = labels.map((label) => {
        let opt = options.find((o) => o.label === label);
        if (!opt) {
          opt = { id: uid(), label, color: nextOptionColor(options) };
          options = [...options, opt];
        }
        return opt.id;
      });
      next = type === 'multiselect' ? ids : ids[0] ?? null;
    } else {
      next = convertValue(value, field, type);
    }
    return { ...row, cells: { ...row.cells, [fieldId]: next } };
  });
  return {
    ...sheet,
    fields: sheet.fields.map((f) =>
      f.id === fieldId
        ? {
            ...f,
            type,
            options: isChoice(type) ? options : undefined,
            relation: type === 'relation' ? f.relation : undefined,
            relationMulti: type === 'relation' ? f.relationMulti : undefined,
            formula: type === 'formula' ? f.formula : undefined,
            rollup: type === 'rollup' ? f.rollup : undefined,
          }
        : f,
    ),
    rows,
  };
}

/** Sortierschlüssel einer Zelle; leere Werte landen immer unten. */
function sortKey(field: Field, value: CellValue): string | number | null {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    case 'checkbox':
      return value ? 1 : 0;
    case 'select':
      return field.options?.find((o) => o.id === value)?.label ?? null;
    case 'multiselect':
      return (value as string[]).map((id) => field.options?.find((o) => o.id === id)?.label ?? '').join(', ');
    case 'relation':
      return null; // Titel der Zielzeile ist hier nicht bekannt – Sortierung nach Verknüpfung ergibt wenig Sinn.
    case 'formula':
    case 'rollup':
      return typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number);
    default:
      return String(value);
  }
}

/** Zeilen sortieren. `valueOf` liefert den Zellwert (für berechnete Felder); ohne Angabe der gespeicherte. */
export function sortRows(sheet: Sheet, rows: Row[], sort: Sort | null | undefined, valueOf: (field: Field, row: Row) => CellValue = (f, r) => r.cells[f.id] ?? null): Row[] {
  const field = sort && sheet.fields.find((f) => f.id === sort.fieldId);
  if (!sort || !field) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const ka = sortKey(field, valueOf(field, a));
    const kb = sortKey(field, valueOf(field, b));
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * dir;
    return String(ka).localeCompare(String(kb), 'de', { numeric: true, sensitivity: 'base' }) * dir;
  });
}

/** Zeilen in der Reihenfolge der ersten Ansicht (z. B. für die Auswahl in Verknüpfungsfeldern). */
export function sortedRows(sheet: Sheet): Row[] {
  return sortRows(sheet, sheet.rows, sheetViews(sheet)[0].sort);
}

/** Link-Ziel für URL/E-Mail/Telefon-Zellen. */
export function cellHref(type: FieldType, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (type === 'email') return `mailto:${v}`;
  if (type === 'phone') return `tel:${v.replace(/[^\d+]/g, '')}`;
  if (type === 'url') return /^[a-z]+:/i.test(v) ? v : `https://${v}`;
  return null;
}
