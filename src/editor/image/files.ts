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

/** Legt eine Bilddatei lokal ab und liefert die Quelle `file:<id>`. */
export async function storeImage(blob: Blob): Promise<string> {
  return `file:${await storage.putFile(blob)}`;
}

/** Wählt Bilddatei(en), legt sie lokal ab und meldet die Quellen. */
export function pickImages(onPicked: (srcs: string[]) => void, multiple = false) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = multiple;
  input.onchange = async () => {
    const files = [...(input.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    onPicked(await Promise.all(files.map(storeImage)));
  };
  input.click();
}

/** Wählt eine Bilddatei, legt sie lokal ab und fügt sie ein. */
export function pickImage(onPicked: (src: string) => void) {
  pickImages(([src]) => onPicked(src));
}

/** Bilddateien aus einem Drop/Paste. */
export function imageFiles(data: DataTransfer | null | undefined): File[] {
  return [...(data?.files ?? [])].filter((f) => f.type.startsWith('image/'));
}
