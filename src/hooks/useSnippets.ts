import { useEffect, useState } from 'react';
import { storage, type Snippet } from '@/storage';

export type SnippetData = Snippet;

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  useEffect(() => {
    storage.listSnippets().then(setSnippets);
  }, []);
  return { snippets };
}
