import { useState } from 'react';
import { Icon } from '@/ui/Icon';
import { tagColors } from '@/app/actions';
import { fieldTypes, nextOptionColor, uid, type Field, type FieldType } from './model';
import { confirmDialog } from '@/ui/Dialog';

interface FieldMenuProps {
  field: Field;
  sortDir: 'asc' | 'desc' | null;
  startInEdit?: boolean;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSort: (dir: 'asc' | 'desc' | null) => void;
  onUpdate: (field: Field) => void;
  onChangeType: (type: FieldType) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Menü am Spaltenkopf: Sortieren, Feld bearbeiten (Name, Typ, Optionen), verschieben, löschen. */
export function FieldMenu(props: FieldMenuProps) {
  const { field, sortDir, onSort, onClose } = props;
  const [editing, setEditing] = useState(!!props.startInEdit);

  if (editing) return <FieldEditor {...props} onDone={onClose} />;

  return (
    <div className="b-pop-list">
      <p className="b-pop-label">Sortieren</p>
      <button type="button" className={`b-pop-item${sortDir === 'asc' ? ' is-active' : ''}`} onClick={() => (onSort('asc'), onClose())}>
        <Icon name="arrowDown" className="b-pop-icon" /> A → Z
      </button>
      <button type="button" className={`b-pop-item${sortDir === 'desc' ? ' is-active' : ''}`} onClick={() => (onSort('desc'), onClose())}>
        <Icon name="arrowUp" className="b-pop-icon" /> Z → A
      </button>
      {sortDir && (
        <button type="button" className="b-pop-item" onClick={() => (onSort(null), onClose())}>
          <Icon name="x" className="b-pop-icon" /> Sortierung aufheben
        </button>
      )}
      <hr className="b-pop-sep" />
      <button type="button" className="b-pop-item" onClick={() => setEditing(true)}>
        <Icon name="pencil" className="b-pop-icon" /> Feld bearbeiten
      </button>
      <button type="button" className="b-pop-item" disabled={!props.canMoveLeft} onClick={() => props.onMove(-1)}>
        <Icon name="arrowLeft" className="b-pop-icon" /> Nach links
      </button>
      <button type="button" className="b-pop-item" disabled={!props.canMoveRight} onClick={() => props.onMove(1)}>
        <Icon name="arrowRight" className="b-pop-icon" /> Nach rechts
      </button>
      <hr className="b-pop-sep" />
      <button
        type="button"
        className="b-pop-item is-danger"
        disabled={!props.canDelete}
        onClick={async () => {
          if (!(await confirmDialog(`Feld „${field.name}“ mit allen Werten löschen?`, { confirmLabel: 'Löschen', danger: true }))) return;
          props.onDelete();
          onClose();
        }}
      >
        <Icon name="trash" className="b-pop-icon" /> Feld löschen
      </button>
    </div>
  );
}

function FieldEditor({ field, onUpdate, onChangeType, onDone }: FieldMenuProps & { onDone: () => void }) {
  const [name, setName] = useState(field.name);
  const isChoice = field.type === 'select' || field.type === 'multiselect';
  const options = field.options ?? [];

  const commitName = () => {
    const n = name.trim();
    if (n && n !== field.name) onUpdate({ ...field, name: n });
  };

  return (
    <div className="b-field-edit">
      <label className="b-field-edit-label">
        Name
        <input
          autoFocus
          className="b-pop-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitName();
              onDone();
            }
          }}
        />
      </label>
      <p className="b-pop-label">Typ</p>
      <div className="b-field-types" role="radiogroup" aria-label="Feldtyp">
        {fieldTypes.map((t) => (
          <button
            key={t.type}
            type="button"
            role="radio"
            aria-checked={t.type === field.type}
            className={`b-pop-item${t.type === field.type ? ' is-active' : ''}`}
            onClick={() => onChangeType(t.type)}
          >
            <Icon name={t.icon} className="b-pop-icon" /> {t.label}
            {t.type === field.type && <Icon name="check" className="b-pop-check" />}
          </button>
        ))}
      </div>
      {isChoice && (
        <>
          <p className="b-pop-label">Optionen</p>
          <div className="b-field-options">
            {options.map((o) => (
              <div key={o.id} className="b-field-option" data-color={o.color}>
                <button
                  type="button"
                  className="b-field-option-color"
                  title="Farbe wechseln"
                  aria-label="Farbe wechseln"
                  onClick={() => {
                    const i = tagColors.findIndex((c) => c.value === o.color);
                    const color = tagColors[(i + 1) % tagColors.length].value;
                    onUpdate({ ...field, options: options.map((x) => (x.id === o.id ? { ...x, color } : x)) });
                  }}
                />
                <input
                  value={o.label}
                  aria-label="Option"
                  onChange={(e) => onUpdate({ ...field, options: options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  className="b-field-option-del"
                  aria-label={`${o.label} entfernen`}
                  onClick={() => onUpdate({ ...field, options: options.filter((x) => x.id !== o.id) })}
                >
                  <Icon name="x" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="b-pop-item"
              onClick={() => onUpdate({ ...field, options: [...options, { id: uid(), label: `Option ${options.length + 1}`, color: nextOptionColor(options) }] })}
            >
              <Icon name="plus" className="b-pop-icon" /> Option hinzufügen
            </button>
          </div>
        </>
      )}
      <div className="b-field-edit-foot">
        <button
          type="button"
          className="b-field-edit-done"
          onClick={() => {
            commitName();
            onDone();
          }}
        >
          <Icon name="check" /> Fertig
        </button>
      </div>
    </div>
  );
}
