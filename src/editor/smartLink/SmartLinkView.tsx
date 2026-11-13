import { useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { sanitizeHref } from '@/lib/url';
import { Icon } from '@/ui/Icon';
import { BarButton, BarSep, useBarSubmenu, useBlockBar } from '../BlockBar';
import { smartBlockToLink, type SmartLinkView_ } from './SmartLinkNode';
import { SmartLinkOptions } from './SmartLinkOptions';
import { analyzeUrl } from './urlPatterns';
import { Favicon } from './Favicon';

/** Externer Link als Block: Zeile mit Favicon/Domain, eingebettetes Bild, Video oder Audio. */
export function SmartLinkView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const viewMenu = useBarSubmenu(editor, { icon: 'noteRow', label: 'Darstellung', text: 'Darstellung', popoverClassName: 'nv-pop', popoverAlign: 'end' });
  const [broken, setBroken] = useState(false);
  const { href: rawHref, view, title } = node.attrs as { href: string; view: 'row' | 'image' | 'video' | 'audio'; title: string };

  const href = sanitizeHref(rawHref) ?? '';
  const info = useMemo(() => analyzeUrl(href), [href]);
  const embedView = info.kind === 'generic' ? null : info.kind;
  const label = title || href;

  useEffect(() => setBroken(false), [href]);

  function open(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  }

  function setView(v: SmartLinkView_) {
    if (v === 'link') {
      const pos = getPos();
      viewMenu.close();
      if (typeof pos === 'number') smartBlockToLink(editor, pos);
      return;
    }
    updateAttributes({ view: v });
  }

  const menu = (
    <>
      {bar.render(
        <>
          {viewMenu.button}
          <BarSep />
          <BarButton icon="external" label="Link öffnen" text="Öffnen" onClick={() => href && window.open(href, '_blank', 'noopener,noreferrer')} />
        </>,
      )}
      {viewMenu.submenu(
        <SmartLinkOptions
          view={view}
          embedView={embedView}
          onView={setView}
          title={title}
          placeholder={info.domain}
          onTitle={(t) => updateAttributes({ title: t })}
        />,
      )}
    </>
  );

  if (view === 'image') {
    // Ohne erkanntes Bild-Muster (z. B. Imgur-Galerie-Link) die URL selbst probieren –
    // viele Bild-Hoster liefern auch ohne Datei-Endung ein Bild aus.
    const src = info.imageSrc ?? href;
    return (
      <NodeViewWrapper className={`sl sl--image${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
        {menu}
        <a href={href || undefined} className="sl-image" onClick={open} draggable={false}>
          {broken ? (
            <div className="sl-image-broken">
              <Icon name="image" />
              <span>Bild konnte nicht geladen werden</span>
            </div>
          ) : (
            <img src={src} alt={label} onError={() => setBroken(true)} />
          )}
        </a>
      </NodeViewWrapper>
    );
  }

  if ((view === 'video' || view === 'audio') && info.embedSrc) {
    // Spotify legt seine Player-Höhe selbst fest (kompakt bei Track/Episode, hoch bei Album/Playlist) –
    // die Karte bekommt exakt diese Höhe statt eines erzwungenen Seitenverhältnisses mit Rest-Fläche.
    const style =
      view === 'audio' ? ({ '--sl-audio-h': info.embedRatio === 1 ? '352px' : '152px' } as React.CSSProperties) : { aspectRatio: info.embedRatio ?? 16 / 9 };
    return (
      <NodeViewWrapper className={`sl sl--embed is-${view}${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
        {menu}
        <div className="sl-embed" style={style}>
          <iframe src={info.embedSrc} title={label} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        </div>
      </NodeViewWrapper>
    );
  }

  // Zeile (auch Fallback, falls die Einbettung fehlschlägt).
  return (
    <NodeViewWrapper className={`sl sl--row${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
      {menu}
      <a href={href || undefined} className="sl-row" onClick={open} draggable={false}>
        <span className="sl-icon" aria-hidden="true">
          <Favicon domain={info.domain} />
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
