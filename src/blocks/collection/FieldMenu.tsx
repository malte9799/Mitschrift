import { Fragment, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/ui/Icon';
import { tagColors } from '@/app/actions';
import { fieldIcon, fieldIconOf, fieldTypes, isChoiceType, nextOptionColor, uid, type Field } from './model';
import { Popover } from './Popover';
import { confirmDialog } from '@/ui/Dialog';

interface FieldMenuProps {
  field: Field;
  sortDir: 'asc' | 'desc' | null;
  startInEdit?: boolean;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSort: (dir: 'asc' | 'desc' | null) => void;
  /** Bearbeitetes Feld übernehmen (Name, Symbol, Typ, Optionen). */
  onSave: (field: Field) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Menü am Spaltenkopf: Sortieren, Feld bearbeiten (Name, Typ, Optionen), verschieben, löschen. */
export function FieldMenu(props: FieldMenuProps) {
  const { field, sortDir, onSort, onClose } = props;
  const [editing, setEditing] = useState(!!props.startInEdit);

  if (editing)
    return (
      <FieldForm
        field={field}
        mode="edit"
        onSubmit={(f) => {
          props.onSave(f);
          onClose();
        }}
        onCancel={onClose}
      />
    );

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

/** Symbole, die man einem Feld geben kann (zusätzlich zum Standard-Symbol des Typs). */
const iconChoices: IconName[] = [
  'fieldText', 'fieldNumber', 'checkbox', 'calendar', 'clock', 'link', 'globe', 'mail', 'phone',
  'fieldSelect', 'fieldMulti', 'star', 'note', 'sticky', 'file', 'image', 'list', 'steps', 'timeline',
  'bars', 'cards', 'quiz', 'pencil', 'code', 'callout', 'cycle', 'collection',
];

interface FieldFormProps {
  field: Field;
  mode: 'add' | 'edit';
  onSubmit: (field: Field) => void;
  onCancel: () => void;
}

/** Feld anlegen bzw. bearbeiten: Symbol, Name, Typ und Optionen. Übernommen wird erst beim Bestätigen. */
export function FieldForm({ field, mode, onSubmit, onCancel }: FieldFormProps) {
  const [draft, setDraft] = useState(field);
  const [picker, setPicker] = useState<'icon' | 'type' | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // Nicht per autoFocus: Das Popover ist im ersten Frame noch unsichtbar und nimmt keinen Fokus an.
  useEffect(() => {
    const id = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);
  const options = draft.options ?? [];
  const setOptions = (next: typeof options) => setDraft((d) => ({ ...d, options: next }));
  const type = fieldTypes.find((t) => t.type === draft.type) ?? fieldTypes[0];
  const valid = draft.name.trim() !== '';

  const submit = () => {
    if (!valid) return;
    onSubmit({ ...draft, name: draft.name.trim(), options: isChoiceType(draft.type) ? options : undefined });
  };

  return (
    <form
      className="b-field-edit"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="b-field-edit-head">
        <span>{mode === 'add' ? 'Feld hinzufügen' : 'Feld bearbeiten'}</span>
        <button type="button" className="b-field-edit-close" aria-label="Schließen" onClick={onCancel}>
          <Icon name="x" />
        </button>
      </div>

      <div className="b-field-edit-row">
        <button
          ref={iconRef}
          type="button"
          className={`b-field-icon-btn${picker === 'icon' ? ' is-open' : ''}`}
          title="Symbol wählen"
          aria-label="Symbol wählen"
          onClick={() => setPicker((p) => (p === 'icon' ? null : 'icon'))}
        >
          <Icon name={fieldIconOf(draft)} />
        </button>
        <input
          ref={nameRef}
          className="b-field-input"
          placeholder="Feldname"
          aria-label="Feldname"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <p className="b-field-edit-label">Typ</p>
      <button
        ref={typeRef}
        type="button"
        className={`b-field-select${picker === 'type' ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={picker === 'type'}
        onClick={() => setPicker((p) => (p === 'type' ? null : 'type'))}
      >
        <Icon name={type.icon} className="b-pop-icon" />
        <span>{type.label}</span>
        <Icon name="chevron" className="b-field-select-chevron" />
      </button>

      {isChoiceType(draft.type) && (
        <>
          <p className="b-field-edit-label">Optionen</p>
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
                    setOptions(options.map((x) => (x.id === o.id ? { ...x, color } : x)));
                  }}
                />
                <input value={o.label} aria-label="Option" onChange={(e) => setOptions(options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))} />
                <button type="button" className="b-field-option-del" aria-label={`${o.label} entfernen`} onClick={() => setOptions(options.filter((x) => x.id !== o.id))}>
                  <Icon name="x" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="b-pop-item"
              onClick={() => setOptions([...options, { id: uid(), label: `Option ${options.length + 1}`, color: nextOptionColor(options) }])}
            >
              <Icon name="plus" className="b-pop-icon" /> Option hinzufügen
            </button>
          </div>
        </>
      )}

      <div className="b-field-edit-foot">
        <button type="button" className="b-field-btn" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="b-field-btn is-primary" disabled={!valid}>
          {mode === 'add' ? 'Hinzufügen' : 'Speichern'}
        </button>
      </div>

      {picker === 'type' && typeRef.current && (
        <Popover anchor={typeRef.current} onClose={() => setPicker(null)} className="b-typepick" matchWidth>
          <div className="b-pop-list" role="listbox" aria-label="Feldtyp">
            {fieldTypes.map((t) => (
              <Fragment key={t.type}>
                {t.group && <hr className="b-pop-sep" />}
                <button
                  type="button"
                  role="option"
                  aria-selected={t.type === draft.type}
                  className={`b-pop-item${t.type === draft.type ? ' is-active' : ''}`}
                  onClick={() => {
                    setDraft((d) => ({ ...d, type: t.type }));
                    setPicker(null);
                  }}
                >
                  <Icon name={t.icon} className="b-pop-icon" /> {t.label}
                  {t.type === draft.type && <Icon name="check" className="b-pop-check" />}
                </button>
              </Fragment>
            ))}
          </div>
        </Popover>
      )}

      {picker === 'icon' && iconRef.current && (
        <Popover anchor={iconRef.current} onClose={() => setPicker(null)} className="b-iconpick">
          <button
            type="button"
            className={`b-pop-item${!draft.icon ? ' is-active' : ''}`}
            onClick={() => {
              setDraft((d) => ({ ...d, icon: undefined }));
              setPicker(null);
            }}
          >
            <Icon name={fieldIcon(draft.type)} className="b-pop-icon" /> Standard ({type.label})
          </button>
          <hr className="b-pop-sep" />
          <div className="b-iconpick-grid">
            {iconChoices.map((name) => (
              <button
                key={name}
                type="button"
                className={draft.icon === name ? 'is-active' : undefined}
                aria-label={name}
                onClick={() => {
                  setDraft((d) => ({ ...d, icon: name }));
                  setPicker(null);
                }}
              >
                <Icon name={name} />
              </button>
            ))}
          </div>
        </Popover>
      )}
    </form>
  );
}
