import type { Tag } from '@/storage';
import { Icon } from './Icon';

interface TagChipProps {
  tag: Tag;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

/** Farbiges Tag-Etikett (z. B. ein Fach), optional klickbar und/oder entfernbar. */
export function TagChip({ tag, active, onClick, onRemove }: TagChipProps) {
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
      {onRemove && (
        <button type="button" className="tag-remove" aria-label={`${tag.name} entfernen`} onClick={onRemove}>
          <Icon name="x" />
        </button>
      )}
    </span>
  );
}
