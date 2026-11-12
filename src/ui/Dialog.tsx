import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/** Ersatz für window.confirm/alert im App-Design (die nativen Dialoge folgen nicht dem Theme). */
interface DialogRequest {
  message: string;
  confirmLabel: string;
  cancelLabel: string | null;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

let current: DialogRequest | null = null;
const listeners = new Set<() => void>();

function show(req: Omit<DialogRequest, 'resolve'>) {
  current?.resolve(false);
  return new Promise<boolean>((resolve) => {
    current = { ...req, resolve };
    listeners.forEach((l) => l());
  });
}

function close(ok: boolean) {
  const req = current;
  current = null;
  listeners.forEach((l) => l());
  req?.resolve(ok);
}

export function confirmDialog(message: string, opts: { confirmLabel?: string; cancelLabel?: string; danger?: boolean } = {}) {
  return show({ message, confirmLabel: opts.confirmLabel ?? 'OK', cancelLabel: opts.cancelLabel ?? 'Abbrechen', danger: opts.danger ?? false });
}

export function alertDialog(message: string) {
  return show({ message, confirmLabel: 'OK', cancelLabel: null, danger: false }).then(() => undefined);
}

/** Einmal im Layout einbinden. */
export function DialogHost() {
  const req = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [req]);

  return (
    <AnimatePresence>
      {req && (
        <motion.div className="dialog-backdrop" onMouseDown={() => close(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label={req.message}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
          >
            <p>{req.message}</p>
            <div className="dialog-actions">
              {req.cancelLabel && (
                <button type="button" className="b-btn" onClick={() => close(false)}>
                  {req.cancelLabel}
                </button>
              )}
              <button
                ref={confirmRef}
                type="button"
                className={`b-btn ${req.danger ? 'b-btn-danger' : 'b-btn-primary'}`}
                onClick={() => close(true)}
              >
                {req.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
