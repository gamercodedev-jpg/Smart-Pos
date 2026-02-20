import { idbGet, idbSet } from '@/lib/idbKv';

const IMAGE_PREFIX = 'mthunzi.posMenu.image.v1:';

const resolvedCache = new Map<string, string>();

export function posMenuImageKey(itemId: string) {
  return `${IMAGE_PREFIX}${itemId}`;
}

export function isIdbImageRef(src: string) {
  return src.startsWith('idb:');
}

export function toIdbImageRef(key: string) {
  return `idb:${key}`;
}

export function fromIdbImageRef(ref: string) {
  return ref.slice('idb:'.length);
}

export async function storePosMenuImageDataUrl(itemId: string, dataUrl: string): Promise<string> {
  const key = posMenuImageKey(itemId);
  resolvedCache.set(toIdbImageRef(key), dataUrl);
  await idbSet(key, dataUrl);
  return toIdbImageRef(key);
}

export async function resolvePosMenuImage(src: string): Promise<string> {
  if (!src) return src;
  if (!isIdbImageRef(src)) return src;

  const cached = resolvedCache.get(src);
  if (cached) return cached;

  const key = fromIdbImageRef(src);
  const dataUrl = await idbGet<string>(key);
  const resolved = dataUrl || '/menu/placeholder-burger.svg';
  resolvedCache.set(src, resolved);
  return resolved;
}
