import { Icon, type IconName } from '@/ui/Icon';
import { noteSizeLabels, noteViewLabels, type NoteCardSize, type NoteView } from './NoteBlockNode';

interface NoteViewOptionsProps {
  view: NoteView;
  size: NoteCardSize;
  onView: (view: NoteView) => void;
  onSize: (size: NoteCardSize) => void;
  /** Untertitel-Einstellung (nur für Blöcke): `null` = automatisch, `''` = aus. */
  subtitle?: string | null;
  autoSubtitle?: string;
  onSubtitle?: (subtitle: string | null) => void;
}

const viewIcons: Record<NoteView, IconName> = { link: 'link', row: 'noteRow', card: 'noteCard' };

/** Darstellungs-Auswahl für Notiz-Verweise – im Block-Menü und in der Link-Vorschau. */
export function NoteViewOptions({ view, size, onView, onSize, subtitle, autoSubtitle, onSubtitle }: NoteViewOptionsProps) {
  return (
    <div className="nv-options">
      <p className="b-pop-label">Darstellung</p>
      <div className="nv-seg" role="radiogroup" aria-label="Darstellung">
        {(Object.keys(noteViewLabels) as NoteView[]).map((v) => (
          <button key={v} type="button" role="radio" aria-checked={v === view} className={v === view ? 'is-active' : ''} onClick={() => onView(v)}>
            <Icon name={viewIcons[v]} />
            {noteViewLabels[v]}
          </button>
        ))}
      </div>
      {view === 'card' && (
        <>
          <p className="b-pop-label">Größe</p>
          <div className="nv-seg is-sizes" role="radiogroup" aria-label="Größe">
            {(Object.keys(noteSizeLabels) as NoteCardSize[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={s === size} className={s === size ? 'is-active' : ''} onClick={() => onSize(s)} title={noteSizeLabels[s]}>
                <span className={`nv-size-glyph is-${s}`} aria-hidden="true" />
                {noteSizeLabels[s]}
              </button>
            ))}
          </div>
        </>
      )}
      {onSubtitle && view !== 'link' && !(view === 'card' && size === 's') && (
        <>
          <label className="nv-switch">
            <span className="b-pop-label">Untertitel</span>
            <input type="checkbox" checked={subtitle !== ''} onChange={(e) => onSubtitle(e.target.checked ? null : '')} />
            <span className="nv-switch-track" aria-hidden="true" />
          </label>
          {subtitle !== '' && (
            <input
              className="b-pop-input"
              value={subtitle ?? ''}
              placeholder={autoSubtitle || 'Automatisch aus dem Text'}
              onChange={(e) => onSubtitle(e.target.value || null)}
            />
          )}
        </>
      )}
    </div>
  );
}
