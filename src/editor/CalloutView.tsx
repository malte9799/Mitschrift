import type { CSSProperties } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useBarSubmenu, useBlockBar } from './BlockBar';
import {
  calloutColors,
  calloutIcons,
  calloutLabels,
  calloutPresets,
  calloutVariants,
  resolveCallout,
  type CalloutColor,
  type CalloutIcon,
} from './CalloutNode';

function CalloutSymbol({ icon }: { icon: CalloutIcon }) {
  return (
    <svg
      className="callout-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: calloutIcons[icon] }}
    />
  );
}

export function CalloutView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const menu = useBarSubmenu(editor, { icon: 'palette', label: 'Stil', text: 'Stil', popoverClassName: 'c-callout-pop' });
  const c = resolveCallout(node.attrs);
  const tone = { '--tone': calloutColors[c.color].css } as CSSProperties;
  const custom = !!(node.attrs.title || node.attrs.icon || node.attrs.color);

  return (
    <NodeViewWrapper className={`callout callout-${c.variant} callout-style-${c.style}`} data-callout={c.variant} style={tone}>
      {bar.render(menu.button)}
      <div className="callout-title" contentEditable={false}>
        <CalloutSymbol icon={c.icon} />
        <span>{c.title}</span>
      </div>
      <NodeViewContent className="callout-body" />

      {menu.submenu(
        <>
          <p className="b-pop-label">Vorlage</p>
          <div className="c-callout-presets">
            {calloutVariants.map((v) => (
              <button
                key={v}
                type="button"
                className={v === c.variant && !custom ? 'is-active' : ''}
                style={{ '--tone': calloutColors[calloutPresets[v].color].css } as CSSProperties}
                onClick={() => updateAttributes({ variant: v, title: null, icon: null, color: null })}
              >
                <CalloutSymbol icon={calloutPresets[v].icon} />
                {calloutLabels[v]}
              </button>
            ))}
          </div>

          <p className="b-pop-label">Titel</p>
          <input
            className="b-pop-input"
            value={node.attrs.title ?? ''}
            placeholder={calloutLabels[c.variant]}
            onChange={(e) => updateAttributes({ title: e.target.value || null })}
            onKeyDown={(e) => e.key === 'Enter' && menu.close()}
          />

          <p className="b-pop-label">Symbol</p>
          <div className="c-callout-icons" style={tone}>
            {(Object.keys(calloutIcons) as CalloutIcon[]).map((icon) => (
              <button
                key={icon}
                type="button"
                className={icon === c.icon ? 'is-active' : ''}
                onClick={() => updateAttributes({ icon: icon === calloutPresets[c.variant].icon ? null : icon })}
              >
                <CalloutSymbol icon={icon} />
              </button>
            ))}
          </div>

          <p className="b-pop-label">Farbe</p>
          <div className="c-callout-colors">
            {(Object.keys(calloutColors) as CalloutColor[]).map((color) => (
              <button
                key={color}
                type="button"
                title={calloutColors[color].label}
                aria-label={calloutColors[color].label}
                className={color === c.color ? 'is-active' : ''}
                style={{ '--tone': calloutColors[color].css } as CSSProperties}
                onClick={() => updateAttributes({ color: color === calloutPresets[c.variant].color ? null : color })}
              />
            ))}
          </div>

          <p className="b-pop-label">Darstellung</p>
          <div className="c-callout-style" style={tone}>
            <button type="button" className={c.style === 'bar' ? 'is-active' : ''} onClick={() => updateAttributes({ style: null })}>
              Strich
            </button>
            <button type="button" className={c.style === 'background' ? 'is-active' : ''} onClick={() => updateAttributes({ style: 'background' })}>
              Fläche
            </button>
          </div>
        </>,
      )}
    </NodeViewWrapper>
  );
}
