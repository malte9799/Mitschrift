import { Icon, type IconName } from '@/ui/Icon';
import { smartLinkViewLabels, type SmartLinkView_ } from './SmartLinkNode';

interface SmartLinkOptionsProps {
  view: SmartLinkView_;
  /** Welche eingebetteten Darstellungen für diese URL erkannt wurden (max. eine, je nach Art). */
  embedView: Exclude<SmartLinkView_, 'link' | 'row'> | null;
  onView: (view: SmartLinkView_) => void;
  /** Anzeigetitel – wie der Linktext bei einem normalen Markdown-Link `[Titel](url)`. */
  title: string;
  /** Platzhalter, wenn kein eigener Titel gesetzt ist (die Domain). */
  placeholder: string;
  onTitle: (title: string) => void;
}

const viewIcons: Record<SmartLinkView_, IconName> = { link: 'link', row: 'noteRow', image: 'image', video: 'play', audio: 'audio' };

/** Darstellungs-Auswahl für externe Links: Link, Zeile – plus Bild als Fallback-Versuch bei generischen Links,
 * oder Video/Audio, wenn eine Einbettung erkannt wurde (dann ergibt eine separate Bild-Option keinen Sinn,
 * das Thumbnail zeigt schon die Video-/Audio-Darstellung selbst) – und der Anzeigetitel. */
export function SmartLinkOptions({ view, embedView, onView, title, placeholder, onTitle }: SmartLinkOptionsProps) {
  const views: SmartLinkView_[] = ['link', 'row'];
  if (embedView && embedView !== 'image') views.push(embedView);
  else views.push('image');
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
      {view !== 'link' && (
        <>
          <p className="b-pop-label">Titel</p>
          <input className="b-pop-input" value={title} placeholder={placeholder} onChange={(e) => onTitle(e.target.value)} />
        </>
      )}
    </div>
  );
}
