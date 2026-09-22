import type { BlockTypeId } from './blockTypes';

/**
 * Mini-Mockups je Blocktyp, analog zu Craft: statt abstrakter Icons zeigt jede
 * Kachel eine kleine Vorschau des Inhalts (echter Schriftzug, Codezeilen, Foto …).
 */
export function BlockThumbnail({ id }: { id: BlockTypeId }) {
  switch (id) {
    case 'paragraph':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-p">
            Text
          </text>
        </svg>
      );
    case 'heading1':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="23" textAnchor="middle" className="t-word t-word-h1">
            Titel
          </text>
        </svg>
      );
    case 'heading2':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-h2">
            Untertitel
          </text>
        </svg>
      );
    case 'heading3':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="21.5" textAnchor="middle" className="t-word t-word-h3">
            Überschrift
          </text>
        </svg>
      );
    case 'quote':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="9" y="9" width="2.4" height="18" rx="1.2" className="t-fill t-strong" />
          <rect x="16" y="11.5" width="13" height="2.4" rx="1.2" className="t-fill" />
          <rect x="16" y="16.8" width="13" height="2.4" rx="1.2" className="t-fill" />
          <rect x="16" y="22.1" width="8" height="2.4" rx="1.2" className="t-fill" />
        </svg>
      );
    case 'code':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="3" y="5" width="30" height="26" rx="5" className="t-code-bg" />
          <circle cx="8.5" cy="10" r="1" className="t-code-cap" />
          <circle cx="12" cy="10" r="1" className="t-code-cap" />
          <circle cx="15.5" cy="10" r="1" className="t-code-cap" />
          <rect x="7" y="15" width="4.5" height="2.2" rx="1.1" className="t-code-pink" />
          <rect x="13" y="15" width="10" height="2.2" rx="1.1" className="t-code-line" />
          <rect x="9" y="20" width="8" height="2.2" rx="1.1" className="t-code-green" />
          <rect x="18.5" y="20" width="6.5" height="2.2" rx="1.1" className="t-code-line" />
          <rect x="9" y="25" width="13" height="2.2" rx="1.1" className="t-code-line" />
        </svg>
      );
    case 'bulletList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="8.5" cy="11" r="1.6" className="t-fill t-strong" />
          <rect x="13" y="9.7" width="16" height="2.6" rx="1.3" className="t-fill" />
          <circle cx="8.5" cy="18" r="1.6" className="t-fill t-strong" />
          <rect x="13" y="16.7" width="16" height="2.6" rx="1.3" className="t-fill" />
          <circle cx="8.5" cy="25" r="1.6" className="t-fill t-strong" />
          <rect x="13" y="23.7" width="10" height="2.6" rx="1.3" className="t-fill" />
        </svg>
      );
    case 'numberedList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="7.5" y="12.6" textAnchor="middle" className="t-num">
            1
          </text>
          <rect x="13" y="9.7" width="16" height="2.6" rx="1.3" className="t-fill" />
          <text x="7.5" y="19.6" textAnchor="middle" className="t-num">
            2
          </text>
          <rect x="13" y="16.7" width="16" height="2.6" rx="1.3" className="t-fill" />
          <text x="7.5" y="26.6" textAnchor="middle" className="t-num">
            3
          </text>
          <rect x="13" y="23.7" width="10" height="2.6" rx="1.3" className="t-fill" />
        </svg>
      );
    case 'image':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <defs>
            <clipPath id="t-photo-clip">
              <rect x="4" y="6" width="28" height="24" rx="5" />
            </clipPath>
          </defs>
          <rect x="4" y="6" width="28" height="24" rx="5" className="t-photo-bg" />
          <g clipPath="url(#t-photo-clip)">
            <circle cx="13" cy="14" r="3.2" className="t-photo-sun" />
            <path d="M2 27 12 17l6 6 6-7 12 12v3H2z" className="t-photo-hill-back" />
            <path d="M2 30 10 21l7 6 7-8 12 13v0H2z" className="t-photo-hill-front" />
          </g>
        </svg>
      );
    case 'divider':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="6" y="17" width="24" height="2.2" rx="1.1" className="t-fill t-strong" />
        </svg>
      );
    case 'calloutMerke':
    case 'calloutHint':
    case 'calloutWarn': {
      const tone = id === 'calloutMerke' ? 'amber' : id === 'calloutHint' ? 'blue' : 'red';
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true" className={`t-callout t-${tone}`}>
          <rect x="4" y="7" width="28" height="22" rx="4" className="t-callout-bg" />
          <rect x="4" y="7" width="3.5" height="22" rx="1.75" className="t-callout-bar" />
          <rect x="12" y="12.5" width="16" height="2.4" rx="1.2" className="t-fill" />
          <rect x="12" y="17.8" width="16" height="2.4" rx="1.2" className="t-fill" />
          <rect x="12" y="23.1" width="10" height="2.4" rx="1.2" className="t-fill" />
        </svg>
      );
    }
    case 'toggle':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="m7 9.5 3 2.5-3 2.5" className="t-stroke" />
          <rect x="13" y="10.8" width="15" height="2.6" rx="1.3" className="t-fill t-strong" />
          <rect x="13" y="18" width="16" height="2.4" rx="1.2" className="t-fill" />
          <rect x="13" y="23.2" width="11" height="2.4" rx="1.2" className="t-fill" />
        </svg>
      );
    case 'flashcards':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="9" y="6" width="22" height="16" rx="3" className="t-card-back" transform="rotate(8 20 14)" />
          <rect x="5" y="11" width="22" height="16" rx="3" className="t-card-front" />
          <rect x="10" y="17.8" width="12" height="2.6" rx="1.3" className="t-accent" />
        </svg>
      );
    case 'cloze':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="5" y="12" width="7" height="2.4" rx="1.2" className="t-fill" />
          <rect x="14" y="10" width="11" height="6" rx="2" className="t-accent-soft" />
          <rect x="14" y="15" width="11" height="1.3" rx=".65" className="t-accent" />
          <rect x="27" y="12" width="4" height="2.4" rx="1.2" className="t-fill" />
          <rect x="5" y="21" width="20" height="2.4" rx="1.2" className="t-fill" />
        </svg>
      );
    case 'quiz':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="6" y="6" width="18" height="2.6" rx="1.3" className="t-fill t-strong" />
          <rect x="6" y="12" width="24" height="5" rx="2" className="t-option" />
          <rect x="6" y="19" width="24" height="5" rx="2" className="t-option-ok" />
          <path d="m24.5 21.5 1.5 1.5 2.5-3" className="t-stroke-ok" />
          <rect x="6" y="26" width="24" height="5" rx="2" className="t-option" />
        </svg>
      );
    default:
      return null;
  }
}
