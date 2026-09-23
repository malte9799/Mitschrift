import { useEffect, useState } from 'react';
import { storage, type Tag } from '@/storage';

const listeners = new Set<() => void>();

/** Signalisiert allen Tag-Listen, dass sich Tags geändert haben. */
export function notifyTagsChanged() {
  for (const l of listeners) l();
}

/** Alle Tags in Anlege-Reihenfolge; aktualisiert sich bei jeder Änderung. */
export function useTags() {
  const [tags, setTags] = useState<Tag[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => storage.listTags().then((t) => alive && setTags(t));
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, []);

  return tags;
}
