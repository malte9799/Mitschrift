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

/** Wie {@link storeImage}, liefert zusätzlich den ursprünglichen Dateinamen (falls vorhanden). */
export async function storeImageFile(file: File): Promise<{ src: string; filename: string | null }> {
  return { src: await storeImage(file), filename: file.name || null };
}

/** Wählt Bilddatei(en), legt sie lokal ab und meldet Quelle + Originalname. */
export function pickImagesWithNames(onPicked: (items: { src: string; filename: string | null }[]) => void, multiple = false) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = multiple;
  input.onchange = async () => {
    const files = [...(input.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    onPicked(await Promise.all(files.map(storeImageFile)));
  };
  input.click();
}

/** Wählt Bilddatei(en), legt sie lokal ab und meldet die Quellen. */
export function pickImages(onPicked: (srcs: string[]) => void, multiple = false) {
  pickImagesWithNames((items) => onPicked(items.map((i) => i.src)), multiple);
}

/** Wählt eine Bilddatei, legt sie lokal ab und fügt sie ein. */
export function pickImage(onPicked: (src: string) => void) {
  pickImages(([src]) => onPicked(src));
}

/** Wählt eine Bilddatei, legt sie lokal ab und meldet Quelle + Originalname. */
export function pickImageWithName(onPicked: (item: { src: string; filename: string | null }) => void) {
  pickImagesWithNames(([item]) => onPicked(item));
}

/** Bilddateien aus einem Drop/Paste. */
export function imageFiles(data: DataTransfer | null | undefined): File[] {
  return [...(data?.files ?? [])].filter((f) => f.type.startsWith('image/'));
}
