import { useMemo, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { BarButton, BarSep, useBlockBar } from '../BlockBar';
import { smartBlockToLink, type SmartLinkView_ } from './SmartLinkNode';
import { SmartLinkOptions } from './SmartLinkOptions';
import { analyzeUrl, faviconUrl } from './urlPatterns';

/** Externer Link als Block: Karte mit Favicon/Domain, eingebettetes Bild, Video oder Audio. */
export function SmartLinkView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [broken, setBroken] = useState(false);
  const { href, view, title } = node.attrs as { href: string; view: 'card' | 'image' | 'video' | 'audio'; title: string };

  const info = useMemo(() => analyzeUrl(href), [href]);
  const embedView = info.kind === 'generic' ? null : info.kind;
  const label = title || href;

  function open(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  function setView(v: SmartLinkView_) {
    if (v === 'link') {
      const pos = getPos();
      setAnchor(null);
      if (typeof pos === 'number') smartBlockToLink(editor, pos);
      return;
    }
    updateAttributes({ view: v });
  }

  const menu = (
    <>
      {bar.render(
        <>
          <BarButton icon="noteCard" label="Darstellung anpassen" text="Darstellung" chevron active={!!anchor} onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} />
          <BarSep />
          <BarButton icon="external" label="Link öffnen" text="Öffnen" onClick={() => window.open(href, '_blank', 'noopener,noreferrer')} />
        </>,
      )}
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} align="end" className="nv-pop">
          <SmartLinkOptions view={view} embedView={embedView} onView={setView} />
        </Popover>
      )}
    </>
  );

  if (view === 'image' && info.imageSrc) {
    return (
      <NodeViewWrapper className={`sl sl--image${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
        {menu}
        <a href={href} className="sl-image" onClick={open} draggable={false}>
          {broken ? (
            <div className="sl-image-broken">
              <Icon name="image" />
              <span>Bild konnte nicht geladen werden</span>
            </div>
          ) : (
            <img src={info.imageSrc} alt={label} onError={() => setBroken(true)} />
          )}
        </a>
      </NodeViewWrapper>
    );
  }

  if ((view === 'video' || view === 'audio') && info.embedSrc) {
    return (
      <NodeViewWrapper className={`sl sl--embed is-${view}${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
        {menu}
        <div className="sl-embed" style={{ aspectRatio: info.embedRatio ?? 16 / 9 }}>
          <iframe src={info.embedSrc} title={label} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        </div>
      </NodeViewWrapper>
    );
  }

  // Karte (auch Fallback, falls die Einbettung fehlschlägt).
  return (
    <NodeViewWrapper className={`sl sl--card${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
      {menu}
      <a href={href} className="sl-card" onClick={open} draggable={false}>
        <span className="sl-icon" aria-hidden="true">
          <img src={faviconUrl(info.domain)} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        </span>
        <span className="sl-text">
          <span className="sl-title">{label}</span>
          <span className="sl-domain">{info.domain}</span>
        </span>
        <Icon name="external" className="sl-go" />
      </a>
    </NodeViewWrapper>
  );
}
