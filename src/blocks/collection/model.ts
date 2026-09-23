import type { TagColor } from '@/storage';
import type { IconName } from '@/ui/Icon';

export type FieldType = 'text' | 'number' | 'checkbox' | 'date' | 'url' | 'email' | 'phone' | 'select' | 'multiselect';

export interface SelectOption {
  id: string;
  label: string;
  color: TagColor;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  /** Eigenes Symbol im Spaltenkopf; sonst das des Feldtyps. */
  icon?: IconName;
  /** Nur für Einzel-/Mehrfachauswahl. */
  options?: SelectOption[];
}

/** text/url/email/phone/date: string, number: number, checkbox: boolean, select: Options-ID, multiselect: IDs. */
export type CellValue = string | number | boolean | string[] | null;

export interface Row {
  id: string;
  cells: Record<string, CellValue>;
}

export interface Sheet {
  id: string;
  name: string;
  fields: Field[];
  rows: Row[];
  sort?: { fieldId: string; dir: 'asc' | 'desc' } | null;
}

export interface CollectionData {
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
];

export const fieldIcon = (type: FieldType): IconName => fieldTypes.find((f) => f.type === type)?.icon ?? 'fieldText';
export const fieldIconOf = (field: Pick<Field, 'type' | 'icon'>): IconName => field.icon ?? fieldIcon(field.type);
export const isChoiceType = (t: FieldType) => t === 'select' || t === 'multiselect';

export const uid = () => Math.random().toString(36).slice(2, 10);

const optionColors: TagColor[] = ['blue', 'green', 'amber', 'purple', 'red', 'teal', 'pink', 'orange', 'graphite'];
export const nextOptionColor = (options: SelectOption[]): TagColor => optionColors[options.length % optionColors.length];

const emptyRows = (n: number): Row[] => Array.from({ length: n }, () => ({ id: uid(), cells: {} }));

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
  return { title: 'Sammlung', sheets: [sheet] };
}

/** Zellwert als Klartext (Kopieren, Typwechsel). */
export function cellText(field: Field, value: CellValue): string {
  if (value === null || value === undefined) return '';
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
    if (isChoice(type) && isChoice(field.type)) {
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
    fields: sheet.fields.map((f) => (f.id === fieldId ? { ...f, type, options: isChoice(type) ? options : undefined } : f)),
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
    default:
      return String(value);
  }
}

export function sortedRows(sheet: Sheet): Row[] {
  const sort = sheet.sort;
  const field = sort && sheet.fields.find((f) => f.id === sort.fieldId);
  if (!sort || !field) return sheet.rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...sheet.rows].sort((a, b) => {
    const ka = sortKey(field, a.cells[field.id]);
    const kb = sortKey(field, b.cells[field.id]);
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * dir;
    return String(ka).localeCompare(String(kb), 'de', { numeric: true, sensitivity: 'base' }) * dir;
  });
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
