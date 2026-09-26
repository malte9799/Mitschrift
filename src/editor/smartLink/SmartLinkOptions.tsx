import { Icon, type IconName } from '@/ui/Icon';
import { smartLinkViewLabels, type SmartLinkView_ } from './SmartLinkNode';

interface SmartLinkOptionsProps {
  view: SmartLinkView_;
  /** Welche eingebetteten Darstellungen für diese URL erkannt wurden (max. eine, je nach Art). */
  embedView: Exclude<SmartLinkView_, 'link' | 'card'> | null;
  onView: (view: SmartLinkView_) => void;
}

const viewIcons: Record<SmartLinkView_, IconName> = { link: 'link', card: 'noteCard', image: 'image', video: 'play', audio: 'audio' };

/** Darstellungs-Auswahl für externe Links: Link, Karte, plus die zur URL passende Einbettung. */
export function SmartLinkOptions({ view, embedView, onView }: SmartLinkOptionsProps) {
  const views: SmartLinkView_[] = embedView ? ['link', 'card', embedView] : ['link', 'card'];
  return (
    <div className="nv-options">
      <p className="b-pop-label">Darstellung</p>
      <div className="nv-seg" role="radiogroup" aria-label="Darstellung">
        {views.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={v === view} className={v === view ? 'is-active' : ''} onClick={() => onView(v)}>
            <Icon name={viewIcons[v]} />
            {smartLinkViewLabels[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
