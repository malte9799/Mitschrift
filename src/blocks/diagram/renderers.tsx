import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import type { DiagramItem } from './DiagramNode';

const spring = { type: 'spring', bounce: 0.25, duration: 0.5 } as const;
const inView = { once: true, amount: 0.3 } as const;

/** Ablauf: Schritte als verbundene Punkte, per Klick oder Weiter/Zurück durchgehen. */
export function StepsDiagram({ items }: { items: DiagramItem[] }) {
  const [step, setStep] = useState(0);
  const current = Math.min(step, items.length - 1);

  return (
    <div className="d-steps">
      <div className="d-steps-track" style={{ ['--n' as string]: items.length }}>
        <div className="d-steps-line">
          <motion.div className="d-steps-line-fill" animate={{ width: items.length > 1 ? `${(current / (items.length - 1)) * 100}%` : '0%' }} transition={spring} />
        </div>
        {items.map((it, i) => (
          <button key={i} type="button" className={`d-step${i <= current ? ' is-done' : ''}${i === current ? ' is-current' : ''}`} onClick={() => setStep(i)}>
            <motion.span className="d-step-dot" animate={{ scale: i === current ? 1.15 : 1 }} transition={spring}>
              {i < current ? <Icon name="check" /> : i + 1}
            </motion.span>
            <span className="d-step-label">{it.label}</span>
          </button>
        ))}
      </div>
      <div className="d-steps-detail">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <strong>
              {current + 1}. {items[current].label}
            </strong>
            {items[current].text && <p>{items[current].text}</p>}
          </motion.div>
        </AnimatePresence>
        <div className="d-steps-nav">
          <button type="button" className="b-btn" disabled={current === 0} onClick={() => setStep(current - 1)}>
            Zurück
          </button>
          <button type="button" className="b-btn b-btn-primary" disabled={current === items.length - 1} onClick={() => setStep(current + 1)}>
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}

/** Zeitstrahl: Einträge erscheinen nacheinander, sobald der Block ins Bild scrollt. */
export function TimelineDiagram({ items }: { items: DiagramItem[] }) {
  return (
    <motion.ol className="d-timeline" initial="hidden" whileInView="shown" viewport={inView} transition={{ staggerChildren: 0.12 }}>
      <motion.span className="d-timeline-line" variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      {items.map((it, i) => (
        <motion.li key={i} variants={{ hidden: { opacity: 0, x: -12 }, shown: { opacity: 1, x: 0 } }} transition={spring}>
          <span className="d-timeline-dot" />
          <span className="d-timeline-label">{it.label}</span>
          <span className="d-timeline-text">{it.text}</span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

/** Balken: wachsen beim Hereinscrollen, skaliert auf den größten Wert. */
export function BarsDiagram({ items }: { items: DiagramItem[] }) {
  const max = Math.max(...items.map((i) => i.value ?? 0), 0) || 1;
  return (
    <motion.div className="d-bars" initial="hidden" whileInView="shown" viewport={inView} transition={{ staggerChildren: 0.08 }}>
      {items.map((it, i) => {
        const pct = Math.max(((it.value ?? 0) / max) * 100, 1.5);
        return (
          <div key={i} className="d-bar-row">
            <span className="d-bar-label">{it.label}</span>
            <div className="d-bar-track">
              <motion.div
                className="d-bar-fill"
                style={{ ['--hue' as string]: (i * 47) % 360 }}
                variants={{ hidden: { width: '0%' }, shown: { width: `${pct}%` } }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span className="d-bar-value" variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} transition={{ delay: 0.5 }}>
                {it.text || it.value}
              </motion.span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

/** Kreislauf: Stationen im Kreis, ein Lichtpunkt läuft herum; Klick zeigt die Beschreibung. */
export function CycleDiagram({ items }: { items: DiagramItem[] }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const n = items.length;
  const current = Math.min(active, n - 1);

  useEffect(() => {
    if (!auto || n < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 2600);
    return () => clearInterval(t);
  }, [auto, n]);

  const size = 300;
  const r = 110;
  const c = size / 2;
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pos = (i: number) => ({ x: c + r * Math.cos(angle(i)), y: c + r * Math.sin(angle(i)) });

  return (
    <div className="d-cycle">
      <div className="d-cycle-stage">
        <svg viewBox={`0 0 ${size} ${size}`} className="d-cycle-svg" aria-hidden="true">
          <defs>
            <marker id="d-cycle-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className="d-cycle-arrowhead" />
            </marker>
          </defs>
          <circle cx={c} cy={c} r={r} className="d-cycle-ring" />
          {items.map((_, i) => {
            // Pfeil auf dem Ring zwischen zwei Stationen.
            const a0 = angle(i) + 0.32;
            const a1 = angle(i + 1) - 0.32;
            if (a1 <= a0) return null;
            const p0 = { x: c + r * Math.cos(a0), y: c + r * Math.sin(a0) };
            const p1 = { x: c + r * Math.cos(a1), y: c + r * Math.sin(a1) };
            return <path key={i} d={`M${p0.x} ${p0.y} A${r} ${r} 0 0 1 ${p1.x} ${p1.y}`} className={`d-cycle-arc${i === current ? ' is-active' : ''}`} markerEnd="url(#d-cycle-arrow)" />;
          })}
          <motion.circle r="7" className="d-cycle-runner" animate={{ cx: pos(current).x, cy: pos(current).y }} transition={spring} />
        </svg>
        {items.map((it, i) => {
          const p = pos(i);
          return (
            <motion.button
              key={i}
              type="button"
              className={`d-cycle-node${i === current ? ' is-active' : ''}`}
              style={{ left: `${(p.x / size) * 100}%`, top: `${(p.y / size) * 100}%`, x: '-50%', y: '-50%' }}
              onClick={() => {
                setAuto(false);
                setActive(i);
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={inView}
              transition={{ ...spring, delay: i * 0.08 }}
            >
              {it.label}
            </motion.button>
          );
        })}
        <div className="d-cycle-center">
          <AnimatePresence mode="wait">
            <motion.p key={current} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
              {items[current].text || items[current].label}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <button type="button" className="b-chip-btn d-cycle-play" onClick={() => setAuto((a) => !a)}>
        <Icon name={auto ? 'pause' : 'play'} /> {auto ? 'Anhalten' : 'Abspielen'}
      </button>
    </div>
  );
}
