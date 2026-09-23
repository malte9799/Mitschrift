import { useCallback, useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { AutoTextarea } from '@/ui/AutoTextarea';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { shuffle } from '../jsonAttr';
import type { Flashcard } from './FlashcardsNode';

export function FlashcardsView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const cards = node.attrs.cards as Flashcard[];
  return (
    <NodeViewWrapper className="b-block b-cards" data-interactive="">
      {bar.render(<BarButton icon="plus" label="Karte hinzufügen" text="Karte" onClick={() => updateAttributes({ cards: [...cards, { front: '', back: '' }] })} />)}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="cards" /> Karteikarten
          </span>
          <span className="b-block-meta">{cards.length} {cards.length === 1 ? 'Karte' : 'Karten'}</span>
        </div>
        {editable ? <CardsEditor cards={cards} onChange={(c) => updateAttributes({ cards: c })} /> : <CardsDeck cards={cards} />}
      </div>
    </NodeViewWrapper>
  );
}

function CardsEditor({ cards, onChange }: { cards: Flashcard[]; onChange: (cards: Flashcard[]) => void }) {
  const set = (i: number, patch: Partial<Flashcard>) => onChange(cards.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="b-cards-edit">
      <AnimatePresence initial={false}>
        {cards.map((c, i) => (
          <motion.div
            key={i}
            className="b-cards-row"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18 }}
          >
            <span className="b-cards-num">{i + 1}</span>
            <AutoTextarea value={c.front} placeholder="Vorderseite – Begriff oder Frage" onChange={(e) => set(i, { front: e.target.value })} />
            <AutoTextarea value={c.back} placeholder="Rückseite – Antwort" onChange={(e) => set(i, { back: e.target.value })} />
            <button
              type="button"
              className="b-icon-btn"
              aria-label="Karte entfernen"
              disabled={cards.length === 1}
              onClick={() => onChange(cards.filter((_, j) => j !== i))}
            >
              <Icon name="x" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" className="b-add-btn" onClick={() => onChange([...cards, { front: '', back: '' }])}>
        <Icon name="plus" /> Karte hinzufügen
      </button>
    </div>
  );
}

function CardsDeck({ cards }: { cards: Flashcard[] }) {
  const usable = cards.filter((c) => c.front.trim() || c.back.trim());
  const [queue, setQueue] = useState<number[]>([]);
  const [known, setKnown] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(1);
  const [round, setRound] = useState(0);

  const restart = useCallback(() => {
    setQueue(shuffle(usable.length));
    setKnown(0);
    setFlipped(false);
    setRound((r) => r + 1);
  }, [usable.length]);

  useEffect(restart, [restart]);

  if (usable.length === 0) return <p className="b-empty">Noch keine Karten – im Bearbeiten-Modus welche anlegen.</p>;

  const current = queue[0];
  const done = queue.length === 0 && round > 0;

  function answer(gotIt: boolean) {
    setExitDir(gotIt ? 1 : -1);
    setFlipped(false);
    if (gotIt) setKnown((k) => k + 1);
    setQueue(([head, ...rest]) => (gotIt ? rest : [...rest, head]));
  }

  return (
    <div className="b-deck">
      <div className="b-progress" aria-label={`${known} von ${usable.length} gewusst`}>
        <motion.div className="b-progress-bar" animate={{ width: `${(known / usable.length) * 100}%` }} transition={{ type: 'spring', bounce: 0.2 }} />
      </div>

      <div className="b-deck-stage">
        <AnimatePresence mode="popLayout" custom={exitDir}>
          {done ? (
            <motion.div
              key="done"
              className="b-deck-done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <span className="b-deck-done-emoji">🎉</span>
              <strong>Alle {usable.length} Karten gewusst</strong>
              <button type="button" className="b-btn" onClick={restart}>
                <Icon name="shuffle" /> Neu mischen
              </button>
            </motion.div>
          ) : current !== undefined ? (
            <motion.button
              type="button"
              key={`${round}-${current}-${queue.length}`}
              className={`b-card${flipped ? ' is-flipped' : ''}`}
              custom={exitDir}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0, rotate: 0 }}
              variants={{ leave: (dir: number) => ({ opacity: 0, x: dir * 260, rotate: dir * 12, transition: { duration: 0.28 } }) }}
              exit="leave"
              transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Karte umdrehen: Vorderseite' : 'Karte umdrehen: Rückseite'}
            >
              <span className="b-card-inner">
                <span className="b-card-face b-card-front">
                  <span className="b-card-label">Frage</span>
                  {usable[current].front}
                  <span className="b-card-tap">Klicken zum Umdrehen</span>
                </span>
                <span className="b-card-face b-card-back">
                  <span className="b-card-label">Antwort</span>
                  {usable[current].back}
                </span>
              </span>
            </motion.button>
          ) : null}
        </AnimatePresence>
        {!done && queue.length > 1 && <div className="b-deck-shadow" aria-hidden="true" />}
      </div>

      {!done && (
        <div className="b-deck-actions">
          <button type="button" className="b-btn b-btn-again" disabled={!flipped} onClick={() => answer(false)}>
            Nochmal
          </button>
          <span className="b-deck-count">
            {known} / {usable.length}
          </span>
          <button type="button" className="b-btn b-btn-ok" disabled={!flipped} onClick={() => answer(true)}>
            <Icon name="check" /> Gewusst
          </button>
        </div>
      )}
    </div>
  );
}
