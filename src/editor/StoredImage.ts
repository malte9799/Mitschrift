import Image from '@tiptap/extension-image';
import { storage } from '@/storage';

const urlCache = new Map<string, Promise<string>>();

/** Löst `file:<id>` (Bild aus IndexedDB) in eine Blob-URL auf; normale URLs bleiben. */
export function resolveSrc(src: string): Promise<string> {
  if (!src.startsWith('file:')) return Promise.resolve(src);
  let url = urlCache.get(src);
  if (!url) {
    url = storage.getFile(src.slice(5)).then((blob) => (blob ? URL.createObjectURL(blob) : ''));
    urlCache.set(src, url);
  }
  return url;
}

/** Wählt eine Bilddatei, legt sie lokal ab und fügt sie ein. */
export function pickImage(onPicked: (src: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const id = await storage.putFile(file);
    onPicked(`file:${id}`);
  };
  input.click();
}

/** Bild-Node, der lokal gespeicherte Bilder (`file:<id>`) anzeigen kann. */
export const StoredImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      let current = node.attrs.src as string;
      const load = (src: string) => resolveSrc(src).then((u) => src === current && (img.src = u));
      if (node.attrs.alt) img.alt = node.attrs.alt;
      img.draggable = false;
      load(current);
      return {
        dom: img,
        update(next) {
          if (next.type !== node.type) return false;
          if (next.attrs.src !== current) {
            current = next.attrs.src;
            load(current);
          }
          return true;
        },
      };
    };
  },
});
