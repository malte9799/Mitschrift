import { useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { emptyQuestion, type QuizQuestion } from './QuizNode';

export function QuizView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const questions = node.attrs.questions as QuizQuestion[];
  return (
    <NodeViewWrapper className="b-block b-quiz" data-interactive="">
      {bar.render(<BarButton icon="plus" label="Frage hinzufügen" text="Frage" onClick={() => updateAttributes({ questions: [...questions, emptyQuestion()] })} />)}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="quiz" /> Quiz
          </span>
          <span className="b-block-meta">
            {questions.length} {questions.length === 1 ? 'Frage' : 'Fragen'}
          </span>
        </div>
        {editable ? <QuizEditor questions={questions} onChange={(q) => updateAttributes({ questions: q })} /> : <QuizPlayer questions={questions} />}
      </div>
    </NodeViewWrapper>
  );
}

function QuizEditor({ questions, onChange }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  const set = (i: number, patch: Partial<QuizQuestion>) => onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <div className="b-quiz-edit">
      {questions.map((q, i) => (
        <div key={i} className="b-quiz-q">
          <div className="b-quiz-q-head">
            <span className="b-cards-num">{i + 1}</span>
            <input className="b-quiz-question" value={q.question} placeholder="Frage" onChange={(e) => set(i, { question: e.target.value })} />
            <button
              type="button"
              className="b-icon-btn"
              aria-label="Frage entfernen"
              disabled={questions.length === 1}
              onClick={() => onChange(questions.filter((_, j) => j !== i))}
            >
              <Icon name="trash" />
            </button>
          </div>
          <div className="b-quiz-options">
            {q.options.map((opt, k) => (
              <div key={k} className={`b-quiz-opt-edit${q.correct === k ? ' is-correct' : ''}`}>
                <button
                  type="button"
                  className="b-quiz-radio"
                  aria-label="Als richtige Antwort markieren"
                  aria-pressed={q.correct === k}
                  onClick={() => set(i, { correct: k })}
                >
                  {q.correct === k && <Icon name="check" />}
                </button>
                <input
                  value={opt}
                  placeholder={`Antwort ${k + 1}`}
                  onChange={(e) => set(i, { options: q.options.map((o, m) => (m === k ? e.target.value : o)) })}
                />
                <button
                  type="button"
                  className="b-icon-btn"
                  aria-label="Antwort entfernen"
                  disabled={q.options.length <= 2}
                  onClick={() =>
                    set(i, {
                      options: q.options.filter((_, m) => m !== k),
                      correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct,
                    })
                  }
                >
                  <Icon name="x" />
                </button>
              </div>
            ))}
            <button type="button" className="b-add-btn b-add-btn-sm" onClick={() => set(i, { options: [...q.options, ''] })}>
              <Icon name="plus" /> Antwort
            </button>
          </div>
          <input className="b-quiz-why" value={q.why} placeholder="Erklärung (optional) – wird nach dem Antworten gezeigt" onChange={(e) => set(i, { why: e.target.value })} />
        </div>
      ))}
      <button type="button" className="b-add-btn" onClick={() => onChange([...questions, emptyQuestion()])}>
        <Icon name="plus" /> Frage hinzufügen
      </button>
    </div>
  );
}

function QuizPlayer({ questions }: { questions: QuizQuestion[] }) {
  const usable = questions.filter((q) => q.question.trim() && q.options.some((o) => o.trim()));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (usable.length === 0) return <p className="b-empty">Noch keine Fragen – im Bearbeiten-Modus welche anlegen.</p>;

  const done = pos >= usable.length;
  const q = usable[Math.min(pos, usable.length - 1)];

  function pick(k: number) {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.correct) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setPos((p) => p + 1);
  }

  function restart() {
    setPos(0);
    setPicked(null);
    setScore(0);
  }

  return (
    <div className="b-quiz-play">
      <div className="b-progress">
        <motion.div className="b-progress-bar" animate={{ width: `${(Math.min(pos + (picked !== null ? 1 : 0), usable.length) / usable.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="result" className="b-quiz-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <ScoreRing value={score / usable.length} />
            <div>
              <strong>
                {score} von {usable.length} richtig
              </strong>
              <p>{score === usable.length ? 'Perfekt – sitzt!' : score / usable.length >= 0.7 ? 'Gut! Die Fehler nochmal ansehen.' : 'Noch nicht sicher – nochmal durchgehen.'}</p>
              <button type="button" className="b-btn" onClick={restart}>
                <Icon name="swap" /> Nochmal
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={pos}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <p className="b-quiz-counter">
              Frage {pos + 1} von {usable.length}
            </p>
            <h4 className="b-quiz-title">{q.question}</h4>
            <div className="b-quiz-options">
              {q.options.map((opt, k) => {
                if (!opt.trim()) return null;
                const state = picked === null ? '' : k === q.correct ? ' is-correct' : k === picked ? ' is-wrong' : ' is-dim';
                return (
                  <motion.button
                    key={k}
                    type="button"
                    className={`b-quiz-opt${state}`}
                    onClick={() => pick(k)}
                    disabled={picked !== null}
                    whileTap={{ scale: 0.98 }}
                    animate={picked === k && k !== q.correct ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="b-quiz-key">{String.fromCharCode(65 + k)}</span>
                    {opt}
                    {picked !== null && k === q.correct && <Icon name="check" className="b-quiz-mark" />}
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {picked !== null && (
                <motion.div className="b-quiz-feedback" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <p className={picked === q.correct ? 'ok' : 'no'}>{picked === q.correct ? 'Richtig!' : 'Leider falsch.'}</p>
                  {q.why && <p className="b-quiz-why-text">{q.why}</p>}
                  <button type="button" className="b-btn" onClick={next}>
                    {pos + 1 < usable.length ? 'Weiter' : 'Auswertung'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className="b-ring" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="b-ring-track" />
      <motion.circle
        cx="40"
        cy="40"
        r={r}
        className="b-ring-value"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <text x="40" y="44" textAnchor="middle" className="b-ring-text">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}
