import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/ui/Icon';
import { CollectionCell, OptionChip } from './CollectionCell';
import { Popover } from './Popover';
import { cellValue, displayText, groupCellValue, groupRows, type Collections, type RowGroup } from './compute';
import { fieldIconOf, isChoiceType, isComputedType, rowTitle, uid, type CellValue, type Field, type Row, type Sheet, type View } from './model';

/** Was jede Ansicht (außer der Tabelle) vom Sammlungs-Block bekommt. */
export interface ViewCtx {
  sheet: Sheet;
  view: View;
  /** Gefilterte und sortierte Zeilen der Ansicht. */
  rows: Row[];
  all: Collections;
  editable: boolean;
  setCell: (rowId: string, fieldId: string, value: CellValue) => void;
  addRow: (cells?: Record<string, CellValue>) => void;
  addField: (field: Field) => void;
  /** Zeile mit allen Feldern am Element aufklappen. */
  peek: (rowId: string, anchor: HTMLElement) => void;
  updateView: (patch: Partial<View>) => void;
}

/** Feldwert in einer Karte/Zeile: Auswahl als Chips, sonst Text. `null`, wenn die Zelle leer ist. */
function fieldValue(field: Field, row: Row, ctx: ViewCtx): ReactNode {
  const value = cellValue(field, row, ctx.sheet, ctx.all);
  if (isChoiceType(field.type)) {
    const ids = Array.isArray(value) ? value : value ? [value as string] : [];
    const options = ids.map((id) => field.options?.find((o) => o.id === id)).filter((o) => !!o);
    return options.length ? (
      <span key={field.id} className="b-rcard-chips">
        {options.map((o) => (
          <OptionChip key={o!.id} option={o!} />
        ))}
      </span>
    ) : null;
  }
  if (field.type === 'checkbox')
    return value === true ? (
      <span key={field.id} className="b-rcard-prop">
        <Icon name="check" /> {field.name}
      </span>
    ) : null;
  const text = displayText(field, row, ctx.sheet, ctx.all);
  return text ? (
    <span key={field.id} className="b-rcard-prop" title={field.name}>
      <Icon name={fieldIconOf(field)} /> {text}
    </span>
  ) : null;
}

/** Die ersten gefüllten Felder nach dem Titel (ohne das Gruppenfeld) – mehr passt nicht auf eine Karte. */
function cardValues(row: Row, ctx: ViewCtx, skip?: string, max = 4): ReactNode[] {
  return ctx.sheet.fields
    .slice(1)
    .filter((f) => f.id !== skip)
    .map((f) => fieldValue(f, row, ctx))
    .filter((n) => n !== null)
    .slice(0, max);
}

function CardBody({ row, ctx, skip }: { row: Row; ctx: ViewCtx; skip?: string }) {
  const values = cardValues(row, ctx, skip);
  return (
    <>
      <span className="b-rcard-title">
        {row.noteId && <Icon name="file" className="b-rcard-doc" />}
        {rowTitle(ctx.sheet, row)}
      </span>
      {values.length > 0 && <span className="b-rcard-props">{values}</span>}
    </>
  );
}

function ViewHint({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="b-view-hint">
      <p>{children}</p>
      {action && (
        <button type="button" className="b-field-btn" onClick={onAction}>
          <Icon name="plus" /> {action}
        </button>
      )}
    </div>
  );
}

const groupField = (ctx: ViewCtx) => ctx.sheet.fields.find((f) => f.id === ctx.view.groupBy);

/** Zeilen als Abschnitte: nach dem Gruppenfeld der Ansicht, sonst ein einziger Abschnitt ohne Kopf. */
function sections(ctx: ViewCtx): RowGroup[] {
  const field = groupField(ctx);
  return field ? groupRows(ctx.sheet, ctx.rows, field, ctx.all) : [{ key: '', label: '', rows: ctx.rows }];
}

function GroupLabel({ group }: { group: RowGroup }) {
  return (
    <span className="b-group-label">
      {group.color ? <span className="b-chip" data-color={group.color}>{group.label}</span> : <span>{group.label}</span>}
      <span className="b-group-count">{group.rows.length}</span>
    </span>
  );
}

// --- Board --------------------------------------------------------------------------------------

/** Spalten nach einem Auswahlfeld; Karten lassen sich zwischen den Spalten ziehen. */
export function BoardView(ctx: ViewCtx) {
  const { sheet, editable } = ctx;
  const field = groupField(ctx) ?? sheet.fields.find((f) => f.type === 'select');
  const dragging = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  if (!field)
    return (
      <ViewHint
        action={editable ? 'Status-Feld anlegen' : undefined}
        onAction={() => {
          const status: Field = {
            id: uid(),
            name: 'Status',
            type: 'select',
            options: [
              { id: uid(), label: 'Offen', color: 'graphite' },
              { id: uid(), label: 'In Arbeit', color: 'amber' },
              { id: uid(), label: 'Erledigt', color: 'green' },
            ],
          };
          ctx.addField(status);
        }}
      >
        Ein Board sortiert die Zeilen in Spalten – dafür braucht es ein Feld vom Typ „Einzelauswahl“.
      </ViewHint>
    );

  const groups = groupRows(sheet, ctx.rows, field, ctx.all);
  const droppable = (key: string) => editable && groupCellValue(field, key) !== undefined;

  return (
    <div className="b-coll-board">
      {groups.map((g) => (
        <div
          key={g.key}
          className={`b-board-col${over === g.key ? ' is-over' : ''}`}
          onDragOver={(e) => {
            if (!dragging.current || !droppable(g.key)) return;
            e.preventDefault();
            setOver(g.key);
          }}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            const rowId = dragging.current;
            dragging.current = null;
            setOver(null);
            const value = groupCellValue(field, g.key);
            if (rowId && value !== undefined) ctx.setCell(rowId, field.id, value);
          }}
        >
          <div className="b-board-head">
            <GroupLabel group={g} />
          </div>
          {g.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="b-rcard"
              draggable={editable}
              onDragStart={(e) => {
                dragging.current = row.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', rowTitle(sheet, row));
              }}
              onDragEnd={() => {
                dragging.current = null;
                setOver(null);
              }}
              onClick={(e) => ctx.peek(row.id, e.currentTarget)}
            >
              <CardBody row={row} ctx={ctx} skip={field.id} />
            </button>
          ))}
          {editable && droppable(g.key) && (
            <button type="button" className="b-board-add" onClick={() => ctx.addRow({ [field.id]: groupCellValue(field, g.key)! })}>
              <Icon name="plus" /> Neu
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Galerie & Liste ----------------------------------------------------------------------------

export function GalleryView(ctx: ViewCtx) {
  const skip = ctx.view.groupBy ?? undefined;
  return (
    <div className="b-coll-sections">
      {sections(ctx).map((g) => (
        <section key={g.key}>
          {g.label && <GroupLabel group={g} />}
          <div className="b-coll-gallery">
            {g.rows.map((row) => (
              <button key={row.id} type="button" className="b-rcard" onClick={(e) => ctx.peek(row.id, e.currentTarget)}>
                <CardBody row={row} ctx={ctx} skip={skip} />
              </button>
            ))}
            {ctx.editable && !g.label && (
              <button type="button" className="b-rcard b-rcard-new" onClick={() => ctx.addRow()}>
                <Icon name="plus" /> Neu
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ListView(ctx: ViewCtx) {
  const skip = ctx.view.groupBy ?? undefined;
  return (
    <div className="b-coll-sections">
      {sections(ctx).map((g) => (
        <section key={g.key}>
          {g.label && <GroupLabel group={g} />}
          <div className="b-coll-list">
            {g.rows.map((row) => (
              <button key={row.id} type="button" className="b-list-row" onClick={(e) => ctx.peek(row.id, e.currentTarget)}>
                <Icon name={row.noteId ? 'file' : 'note'} className="b-list-icon" />
                <span className="b-list-title">{rowTitle(ctx.sheet, row)}</span>
                <span className="b-list-props">
                  {cardValues(row, ctx, skip, 3)}
                </span>
              </button>
            ))}
            {g.rows.length === 0 && <p className="b-pop-empty">Keine Zeilen.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

// --- Kalender -----------------------------------------------------------------------------------

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Monatsraster nach einem Datumsfeld; Zeilen lassen sich auf einen anderen Tag ziehen. */
export function CalendarView(ctx: ViewCtx) {
  const { sheet, view, editable } = ctx;
  const field = sheet.fields.find((f) => f.id === view.dateFieldId && f.type === 'date') ?? sheet.fields.find((f) => f.type === 'date');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const dragging = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  if (!field)
    return (
      <ViewHint action={editable ? 'Datumsfeld anlegen' : undefined} onAction={() => ctx.addField({ id: uid(), name: 'Datum', type: 'date' })}>
        Der Kalender ordnet die Zeilen nach einem Datumsfeld.
      </ViewHint>
    );

  // Raster beginnt am Montag vor dem Monatsersten und zeigt ganze Wochen.
  const first = new Date(month);
  first.setDate(1 - ((month.getDay() + 6) % 7));
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = Math.ceil(((month.getDay() + 6) % 7 + lastDay.getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  const byDay = new Map<string, Row[]>();
  for (const row of ctx.rows) {
    const d = row.cells[field.id];
    if (typeof d === 'string' && d) byDay.set(d, [...(byDay.get(d) ?? []), row]);
  }
  const undated = ctx.rows.filter((r) => !r.cells[field.id]);
  const today = iso(new Date());
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const chip = (row: Row) => (
    <button
      key={row.id}
      type="button"
      className="b-cal-chip"
      draggable={editable}
      onDragStart={(e) => {
        dragging.current = row.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', rowTitle(sheet, row));
      }}
      onDragEnd={() => {
        dragging.current = null;
        setOver(null);
      }}
      onClick={(e) => ctx.peek(row.id, e.currentTarget)}
    >
      {rowTitle(sheet, row)}
    </button>
  );

  return (
    <div className="b-coll-cal">
      <div className="b-cal-head">
        <strong>{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</strong>
        <span className="b-cal-nav">
          <button type="button" aria-label="Vorheriger Monat" onClick={() => shift(-1)}>
            <Icon name="arrowLeft" />
          </button>
          <button type="button" className="b-cal-today" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Heute
          </button>
          <button type="button" aria-label="Nächster Monat" onClick={() => shift(1)}>
            <Icon name="arrowRight" />
          </button>
        </span>
      </div>
      <div className="b-cal-grid">
        {weekdays.map((w) => (
          <span key={w} className="b-cal-weekday">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const key = iso(d);
          return (
            <div
              key={key}
              className={`b-cal-day${d.getMonth() !== month.getMonth() ? ' is-other' : ''}${key === today ? ' is-today' : ''}${over === key ? ' is-over' : ''}`}
              onDragOver={(e) => {
                if (!dragging.current || !editable) return;
                e.preventDefault();
                setOver(key);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rowId = dragging.current;
                dragging.current = null;
                setOver(null);
                if (rowId) ctx.setCell(rowId, field.id, key);
              }}
            >
              <span className="b-cal-daynum">
                <span>{d.getDate()}</span>
                {editable && (
                  <button type="button" aria-label={`Zeile am ${d.toLocaleDateString('de-DE')} anlegen`} onClick={() => ctx.addRow({ [field.id]: key })}>
                    <Icon name="plus" />
                  </button>
                )}
              </span>
              {(byDay.get(key) ?? []).map(chip)}
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <div className="b-cal-undated">
          <span className="b-group-label">
            <span>Ohne {field.name}</span>
            <span className="b-group-count">{undated.length}</span>
          </span>
          {undated.map(chip)}
        </div>
      )}
    </div>
  );
}

// --- Zeile aufklappen ---------------------------------------------------------------------------

interface RowPeekProps {
  ctx: ViewCtx;
  row: Row;
  anchor: HTMLElement;
  updateField: (field: Field) => void;
  onOpenDoc: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Alle Felder einer Zeile zum Bearbeiten, plus der Weg zu ihrem Dokument. */
export function RowPeek({ ctx, row, anchor, updateField, onOpenDoc, onDelete, onClose }: RowPeekProps) {
  const { sheet, editable } = ctx;
  return (
    <Popover anchor={anchor} onClose={onClose} className="b-rowpeek">
      {sheet.fields.map((f, i) => (
        <div key={f.id} className={`b-peek-field${i === 0 ? ' is-title' : ''}`}>
          {i > 0 && (
            <span className="b-peek-label">
              <Icon name={fieldIconOf(f)} /> {f.name}
            </span>
          )}
          <div className={`b-peek-value is-${f.type}`}>
            <CollectionCell
              field={f}
              value={cellValue(f, row, sheet, ctx.all)}
              editable={editable && !isComputedType(f.type)}
              primary={i === 0}
              onChange={(v) => ctx.setCell(row.id, f.id, v)}
              onFieldChange={updateField}
              all={ctx.all}
            />
          </div>
        </div>
      ))}
      <div className="b-peek-foot">
        {(editable || row.noteId) && (
          <button type="button" className="b-field-btn is-primary" onClick={onOpenDoc}>
            <Icon name="file" /> {row.noteId ? 'Dokument öffnen' : 'Als Dokument öffnen'}
          </button>
        )}
        {editable && (
          <button type="button" className="b-field-btn is-icon" aria-label="Zeile löschen" title="Zeile löschen" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        )}
      </div>
    </Popover>
  );
}
