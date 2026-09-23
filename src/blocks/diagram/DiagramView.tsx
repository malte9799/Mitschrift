import { useId, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { kindLabels, type DiagramItem, type DiagramKind } from './DiagramNode';
import { StepsDiagram, TimelineDiagram, BarsDiagram, CycleDiagram } from './renderers';

const kindIcons: Record<DiagramKind, IconName> = {
  steps: 'steps',
  timeline: 'timeline',
  bars: 'bars',
  cycle: 'cycle',
};

export function DiagramView({ node, editor, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const [editing, setEditing] = useState(false);
  const uid = useId();
  const kind = node.attrs.kind as DiagramKind;
  const items = node.attrs.items as DiagramItem[];
  const title = node.attrs.title as string;
  const visible = items.filter((i) => i.label.trim() || i.text.trim());

  return (
    <NodeViewWrapper className={`b-block b-diagram b-diagram-${kind}`} data-interactive="">
      <div contentEditable={false}>
        <div className="b-block-head">
          {editable ? (
            <div className="b-seg" role="tablist" aria-label="Darstellung">
              {(Object.keys(kindLabels) as DiagramKind[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={k === kind} className={k === kind ? 'active' : ''} onClick={() => updateAttributes({ kind: k })}>
                  {k === kind && <motion.span layoutId={`seg-${uid}`} className="b-seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} />}
                  <Icon name={kindIcons[k]} />
                  <span>{kindLabels[k]}</span>
                </button>
              ))}
            </div>
          ) : (
            <span className="b-block-badge">
              <Icon name={kindIcons[kind]} /> {kindLabels[kind]}
            </span>
          )}
          {editable && (
            <button type="button" className={`b-chip-btn${editing ? ' active' : ''}`} onClick={() => setEditing((e) => !e)}>
              <Icon name={editing ? 'check' : 'pencil'} /> {editing ? 'Fertig' : 'Daten'}
            </button>
          )}
        </div>

        {editable ? (
          <input className="b-diagram-title-input" value={title} placeholder="Titel (optional)" onChange={(e) => updateAttributes({ title: e.target.value })} />
        ) : (
          title && <h4 className="b-diagram-title">{title}</h4>
        )}

        <AnimatePresence initial={false}>
          {editable && editing && (
            <motion.div className="b-diagram-editor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <ItemsEditor kind={kind} items={items} onChange={(next) => updateAttributes({ items: next })} />
            </motion.div>
          )}
        </AnimatePresence>

        {visible.length === 0 ? (
          <p className="b-empty">Noch keine Einträge – über „Daten“ welche anlegen.</p>
        ) : (
          <div className="b-diagram-canvas" key={kind}>
            {kind === 'steps' && <StepsDiagram items={visible} />}
            {kind === 'timeline' && <TimelineDiagram items={visible} />}
            {kind === 'bars' && <BarsDiagram items={visible} />}
            {kind === 'cycle' && <CycleDiagram items={visible} />}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function ItemsEditor({ kind, items, onChange }: { kind: DiagramKind; items: DiagramItem[]; onChange: (items: DiagramItem[]) => void }) {
  const set = (i: number, patch: Partial<DiagramItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const labelPh = kind === 'timeline' ? 'Datum / Zeit' : 'Bezeichnung';
  const textPh = kind === 'bars' ? 'Beschriftung (z. B. „78 %“)' : 'Beschreibung';

  return (
    <div className="b-diagram-items">
      {items.map((it, i) => (
        <div key={i} className={`b-diagram-item${kind === 'bars' ? ' has-value' : ''}`}>
          <div className="b-diagram-order">
            <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)}>
              <Icon name="chevron" className="flip" />
            </button>
            <button type="button" aria-label="Nach unten" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
              <Icon name="chevron" />
            </button>
          </div>
          <input value={it.label} placeholder={labelPh} onChange={(e) => set(i, { label: e.target.value })} />
          {kind === 'bars' && (
            <input
              type="number"
              className="b-diagram-value"
              value={it.value ?? ''}
              placeholder="Wert"
              step="any"
              onChange={(e) => set(i, { value: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          )}
          <input value={it.text} placeholder={textPh} onChange={(e) => set(i, { text: e.target.value })} />
          <button type="button" className="b-icon-btn" aria-label="Eintrag entfernen" disabled={items.length === 1} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Icon name="x" />
          </button>
        </div>
      ))}
      <button type="button" className="b-add-btn" onClick={() => onChange([...items, { label: '', text: '', ...(kind === 'bars' ? { value: 0 } : {}) }])}>
        <Icon name="plus" /> Eintrag hinzufügen
      </button>
    </div>
  );
}
