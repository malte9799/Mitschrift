import { useEffect, useState } from 'react';
import { storage, type Snippet } from '@/storage';
import { onExternalChange } from '@/storage/changes';

export type SnippetData = Snippet;

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => storage.listSnippets().then((s) => alive && setSnippets(s));
    load();
    const off = onExternalChange((c) => c.snippets && load());
    return () => {
      alive = false;
      off();
    };
  }, []);
  return { snippets };
}
