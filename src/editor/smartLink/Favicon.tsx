import { useEffect, useState } from 'react';
import { faviconUrl } from './urlPatterns';

/** Favicon der Seite; fehlt es (oder blockt die Seite es), erscheint ein lokales Globus-Symbol. */
export function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(!/^[a-z0-9.-]+$/i.test(domain));
  useEffect(() => setFailed(!/^[a-z0-9.-]+$/i.test(domain)), [domain]);
  if (failed)
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true" style={{ color: 'var(--ink-soft)' }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  return <img src={faviconUrl(domain)} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
