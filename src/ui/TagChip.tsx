import type { Tag } from '@/storage';
import { Icon } from './Icon';

interface TagChipProps {
  tag: Tag;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  /** Tag komplett löschen (aus allen Notizen) – z. B. im Filter, per Papierkorb. */
  onDelete?: () => void;
}

/** Farbiges Tag-Etikett, optional klickbar, entfernbar (von der Notiz) und/oder löschbar (überall). */
export function TagChip({ tag, active, onClick, onRemove, onDelete }: TagChipProps) {
  const body = (
    <>
      <span className="tag-dot" aria-hidden="true" />
      <span className="tag-name">{tag.name}</span>
    </>
  );
  return (
    <span className={`tag${active ? ' is-active' : ''}${onRemove ? ' is-removable' : ''}`} data-color={tag.color}>
      {onClick ? (
        <button type="button" className="tag-main" onClick={onClick} aria-pressed={active}>
          {body}
        </button>
      ) : (
        <span className="tag-main">{body}</span>
      )}
      {onDelete && (
        <button type="button" className="tag-delete" aria-label={`Tag „${tag.name}“ löschen`} title="Tag löschen" onClick={onDelete}>
          <Icon name="trash" />
        </button>
      )}
      {onRemove && (
        <button type="button" className="tag-remove" aria-label={`${tag.name} entfernen`} onClick={onRemove}>
          <Icon name="x" />
        </button>
      )}
    </span>
  );
}
