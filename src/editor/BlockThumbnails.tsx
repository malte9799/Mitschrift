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
            aA
          </text>
        </svg>
      );
    case 'heading1':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-h1">
            H1
          </text>
        </svg>
      );
    case 'heading2':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-h2">
            H2
          </text>
        </svg>
      );
    case 'heading3':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-h3">
            H3
          </text>
        </svg>
      );
    case 'quote':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="9" y="9" width="2.4" height="18" rx="1.2" className="t-fill t-bar" />
          <rect x="16" y="11.5" width="13" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="16" y="16.8" width="13" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="16" y="22.1" width="8" height="2.4" rx="1.2" className="t-fill t-text" />
        </svg>
      );
    case 'code':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="6.5" width="28" height="23" rx="4" className="t-card-front" />
          <path d="m9.5 13.5-2.5 2.5 2.5 2.5" className="t-stroke t-stroke-accent" />
          <rect x="12.5" y="14.8" width="4" height="2.4" rx="1.2" className="t-code-pink" />
          <rect x="18.5" y="14.8" width="9" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="12.5" y="19.8" width="7" height="2.4" rx="1.2" className="t-code-green" />
          <rect x="21.5" y="19.8" width="5" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="9" y="24.8" width="11" height="2.4" rx="1.2" className="t-fill t-text" />
        </svg>
      );
    case 'bulletList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="8.5" cy="13" r="1.7" className="t-fill t-strong" />
          <path d="M14.8 13c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
          <circle cx="8.5" cy="23" r="1.7" className="t-fill t-strong" />
          <path d="M14.8 23c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
        </svg>
      );
    case 'numberedList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="8" y="13.4" textAnchor="middle" className="t-num">
            1.
          </text>
          <path d="M14.8 13c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
          <text x="8" y="23.4" textAnchor="middle" className="t-num">
            2.
          </text>
          <path d="M14.8 23c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
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
    case 'gallery':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="7" width="13" height="10" rx="3" className="t-photo-bg" />
          <rect x="19" y="7" width="13" height="10" rx="3" className="t-photo-bg" />
          <rect x="4" y="19" width="13" height="10" rx="3" className="t-photo-bg" />
          <rect x="19" y="19" width="13" height="10" rx="3" className="t-photo-bg" />
          <circle cx="9" cy="11" r="1.8" className="t-photo-sun" />
          <path d="M19 17l5-5 4 3 4-3v5z" className="t-photo-hill-front" />
          <path d="M4 29l5-5 4 3 4-2v4z" className="t-photo-hill-back" />
          <circle cx="28" cy="23" r="1.8" className="t-photo-sun" />
        </svg>
      );
    case 'dividerDots':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          {[12, 18, 24].map((x) => (
            <circle key={x} cx={x} cy="18" r="1.3" className="t-fill t-strong" />
          ))}
        </svg>
      );
    case 'dividerDotted':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <line x1="6" y1="18" x2="30" y2="18" className="t-stroke" strokeWidth="1.2" strokeDasharray="0.1 2.6" />
        </svg>
      );
    case 'divider':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="6" y="17.4" width="24" height="1.2" rx="0.6" className="t-fill t-strong" />
        </svg>
      );
    case 'dividerBold':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="6" y="16.5" width="24" height="3" rx="1.5" className="t-fill t-strong" />
        </svg>
      );
    case 'pageBreak':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M8 5v7.5a2.5 2.5 0 0 0 2.5 2.5h15a2.5 2.5 0 0 0 2.5-2.5V5" className="t-box" />
          <path d="M8 31v-7.5a2.5 2.5 0 0 1 2.5-2.5h15a2.5 2.5 0 0 1 2.5 2.5V31" className="t-box" />
        </svg>
      );
    case 'calloutNote':
    case 'calloutTip':
    case 'calloutImportant':
    case 'calloutWarning':
    case 'calloutCaution': {
      const tone = { calloutNote: 'blue', calloutTip: 'green', calloutImportant: 'purple', calloutWarning: 'amber', calloutCaution: 'red' }[id];
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true" className={`t-callout t-${tone}`}>
          <rect x="4" y="7" width="3.5" height="22" rx="1.75" className="t-callout-bar" />
          <rect x="12" y="12.5" width="16" height="2.4" rx="1.2" className="t-fill" />
          <rect x="12" y="17.8" width="16" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="12" y="23.1" width="10" height="2.4" rx="1.2" className="t-fill t-text" />
        </svg>
      );
    }
    case 'toggle':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="m6.8 10.8 3.6 2.2-3.6 2.2z" className="t-fill t-strong" />
          <path d="M14.8 13c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
          <path d="m6.8 20.8 3.6 2.2-3.6 2.2z" className="t-fill t-strong" />
          <path d="M14.8 23c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
        </svg>
      );
    case 'taskList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="5.3" y="9.8" width="6.4" height="6.4" rx="1.6" className="t-accent" />
          <path d="m6.9 13 1.3 1.3 2.3-2.5" className="t-check" />
          <path d="M14.8 13c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
          <rect x="5.6" y="20.1" width="5.8" height="5.8" rx="1.5" className="t-box" />
          <path d="M14.8 23c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" className="t-wave" />
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
          <rect x="4" y="12.3" width="8" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="14" y="9" width="12" height="9" rx="2.5" className="t-gap" />
          <rect x="16.5" y="15" width="7" height="1.6" rx=".8" className="t-accent" />
          <rect x="28" y="12.3" width="4" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="4" y="22.3" width="18" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="24" y="22.3" width="8" height="2.4" rx="1.2" className="t-fill t-text" />
        </svg>
      );
    case 'quiz':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="5" y="5" width="17" height="2.6" rx="1.3" className="t-fill t-strong" />
          {[10.5, 17.5, 24.5].map((y, i) => (
            <g key={y}>
              <rect x="5" y={y} width="26" height="5.5" rx="2" className={i === 1 ? 't-option-ok' : 't-card-front'} />
              <circle cx="9" cy={y + 2.75} r="1.5" className={i === 1 ? 't-ok-dot' : 't-box'} />
              <rect x="12.5" y={y + 2} width={[11, 8, 9][i]} height="1.6" rx=".8" className={i === 1 ? 't-ok-text' : 't-fill t-text'} />
            </g>
          ))}
          <path d="m25 20.2 1.5 1.5 2.5-3" className="t-stroke-ok" />
        </svg>
      );
    case 'table':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="7" width="28" height="22" rx="3" className="t-card-front" />
          <rect x="4.5" y="7.5" width="27" height="6" rx="2.5" className="t-accent-soft" />
          <path d="M4 13.5h28M4 20.5h28M13.5 7v22M23 7v22" className="t-grid" />
        </svg>
      );
    case 'steps':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="7" y="16.8" width="22" height="2.4" rx="1.2" className="t-fill" />
          <rect x="7" y="16.8" width="11" height="2.4" rx="1.2" className="t-accent" />
          <circle cx="7" cy="18" r="3.4" className="t-accent" />
          <circle cx="18" cy="18" r="3.4" className="t-accent" />
          <circle cx="29" cy="18" r="3.4" className="t-dot-off" />
          <rect x="4" y="25" width="7" height="1.8" rx=".9" className="t-fill" />
          <rect x="14.5" y="25" width="7" height="1.8" rx=".9" className="t-fill" />
          <rect x="25.5" y="25" width="7" height="1.8" rx=".9" className="t-fill" />
        </svg>
      );
    case 'timeline':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="6" y="6" width="15" height="4.5" rx="2.25" className="t-accent-soft" />
          <rect x="17" y="12" width="13" height="4.5" rx="2.25" className="t-accent" opacity=".55" />
          <rect x="3" y="19.8" width="30" height="1.6" rx=".8" className="t-fill" />
          <circle cx="10" cy="20.6" r="2.4" className="t-accent" />
          <circle cx="25" cy="20.6" r="2.4" className="t-accent" />
          <rect x="6" y="25.5" width="9" height="2.2" rx="1.1" className="t-fill t-strong" />
          <rect x="21" y="25.5" width="9" height="2.2" rx="1.1" className="t-fill t-text" />
        </svg>
      );
    case 'plot':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="5" width="28" height="26" rx="3" className="t-card-front" />
          <path d="M6 18h24M18 7v22" className="t-grid" />
          <path d="M7 27c4 0 6-17 11-17s6 11 11 11" className="t-stroke t-stroke-accent" />
          <circle cx="18" cy="10" r="1.8" className="t-accent" />
        </svg>
      );
    case 'glossaryList':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="5" y="8" width="7" height="2.6" rx="1.3" className="t-accent" />
          <rect x="15" y="8" width="16" height="2.6" rx="1.3" className="t-fill t-text" />
          <rect x="5" y="16" width="8" height="2.6" rx="1.3" className="t-accent" />
          <rect x="15" y="16" width="12" height="2.6" rx="1.3" className="t-fill t-text" />
          <rect x="5" y="24" width="6" height="2.6" rx="1.3" className="t-accent" />
          <rect x="15" y="24" width="14" height="2.6" rx="1.3" className="t-fill t-text" />
        </svg>
      );
    case 'bars':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="5" y="8" width="24" height="5" rx="2.5" className="t-accent" />
          <rect x="5" y="15.5" width="15" height="5" rx="2.5" className="t-accent" opacity=".7" />
          <rect x="5" y="23" width="8" height="5" rx="2.5" className="t-accent" opacity=".45" />
        </svg>
      );
    case 'cycle':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="10" className="t-ring" />
          <circle cx="18" cy="8" r="3.4" className="t-accent" />
          <circle cx="28" cy="18" r="3.4" className="t-dot-off" />
          <circle cx="18" cy="28" r="3.4" className="t-dot-off" />
          <circle cx="8" cy="18" r="3.4" className="t-dot-off" />
        </svg>
      );
    case 'strong':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-strong">
            St
          </text>
        </svg>
      );
    case 'caption':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="22" textAnchor="middle" className="t-word t-word-caption">
            cC
          </text>
        </svg>
      );
    case 'linkedCollection':
    case 'collection':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="6" width="9" height="4" rx="2" className="t-accent-soft" />
          <rect x="15" y="6" width="6" height="4" rx="2" className="t-fill" />
          <rect x="4" y="12.5" width="28" height="18" rx="2.5" className="t-grid" />
          <path d="M4 17.5h28M4 22.5h28M4 27h28M10 12.5v18M21 12.5v18" className="t-grid" />
          <rect x="22.5" y="19.2" width="6" height="2.4" rx="1.2" className="t-accent" />
          <rect x="11.5" y="14" width="7" height="2" rx="1" className="t-fill t-strong" />
        </svg>
      );
    case 'mermaid':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M18 12v4.5M18 16.5H10.5V21M18 16.5h7.5V21" className="t-stroke" />
          <rect x="11" y="5" width="14" height="7" rx="2.5" className="t-accent" />
          <rect x="4.5" y="21" width="12" height="7" rx="2.5" className="t-card-front" />
          <rect x="19.5" y="21" width="12" height="7" rx="2.5" className="t-card-front" />
          <rect x="7.5" y="23.8" width="6" height="1.6" rx=".8" className="t-fill t-text" />
          <rect x="22.5" y="23.8" width="6" height="1.6" rx=".8" className="t-fill t-text" />
        </svg>
      );
    case 'whiteboard':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="6" width="28" height="22" rx="2.5" className="t-grid" />
          <path d="M9 21c2.5-5 5-7 7-4.5s3.5 2.5 6-2.5" className="t-stroke" />
          <circle cx="25" cy="12" r="2.5" className="t-accent" />
          <rect x="8" y="9" width="7" height="2" rx="1" className="t-fill" />
        </svg>
      );
    case 'svg':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M7 27C11 11 25 25 29 9" className="t-stroke" />
          <rect x="4.5" y="24.5" width="5" height="5" rx="1.2" className="t-accent" />
          <rect x="26.5" y="6.5" width="5" height="5" rx="1.2" className="t-accent" />
          <path d="M7 27 13 14M29 9l-6 13" className="t-grid" />
        </svg>
      );
    case 'noteRow':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="11" width="28" height="14" rx="3" className="t-card-front" />
          <rect x="7.5" y="14.5" width="5.5" height="7" rx="1.2" className="t-accent-soft" />
          <rect x="16" y="14.8" width="11" height="2.4" rx="1.2" className="t-fill t-strong" />
          <rect x="16" y="19.2" width="8" height="1.8" rx=".9" className="t-fill t-text" />
        </svg>
      );
    case 'noteCard':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="5" width="12.5" height="16" rx="2.5" className="t-card-front" />
          <rect x="7" y="8" width="11" height="13" rx="1" className="t-photo-bg" />
          <rect x="8.5" y="10" width="6" height="1.6" rx=".8" className="t-fill t-strong" />
          <rect x="8.5" y="13" width="7" height="1.2" rx=".6" className="t-fill t-text" />
          <rect x="19.5" y="5" width="12.5" height="16" rx="2.5" className="t-card-front" />
          <rect x="22.5" y="8" width="11" height="13" rx="1" className="t-photo-bg" />
          <rect x="24" y="10" width="6" height="1.6" rx=".8" className="t-fill t-strong" />
          <rect x="4" y="24" width="28" height="7" rx="2.5" className="t-card-front" />
          <rect x="6.5" y="26.6" width="9" height="1.8" rx=".9" className="t-fill t-text" />
        </svg>
      );
    case 'formula':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <text x="18" y="23" textAnchor="middle" className="t-word t-word-p">
            x²
          </text>
        </svg>
      );
    case 'footnote':
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <rect x="4" y="10.5" width="24" height="2.4" rx="1.2" className="t-fill t-text" />
          <rect x="4" y="17" width="16" height="2.4" rx="1.2" className="t-fill t-text" />
          <text x="30" y="12.6" textAnchor="middle" className="t-num" fontSize="6">
            1
          </text>
          <rect x="4" y="26" width="1.6" height="1.6" rx=".8" className="t-fill t-strong" />
          <rect x="8" y="26.2" width="18" height="1.6" rx=".8" className="t-fill t-text" />
        </svg>
      );
    default:
      return null;
  }
}
