// Helpers of the asset extraction (scripts/extract-assets.ts and scripts/games/*.ts).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { crop, decodeBitmap, type Image } from './dib.ts';
import { readResources, resource, RT, type Resources } from './pe.ts';
import { encodePng } from './png.ts';
import { strings } from './starview.ts';

export const ROOT = join(import.meta.dirname, '../..');
export const ORIGINAL = join(ROOT, 'original/win95/program');
export const ASSETS = join(ROOT, 'src/assets');

/** StarView resource type of strings (catalogue entries, levels, phrases…). */
export const SV_STRING = 273;

/** The resources of an original file (`bulldoze.exe`, `czgame32.dll`…). */
export const load = async (file: string): Promise<Resources> => readResources(await readFile(join(ORIGINAL, file)));

/** The bytes of an original file (data files such as `crypto1.dat`). */
export const raw = (file: string): Promise<Buffer> => readFile(join(ORIGINAL, file));

/** A Windows bitmap resource, decoded. */
export const bitmap = (resources: Resources, id: number): Image => decodeBitmap(resource(resources, RT.BITMAP, id));

/** The strings of a StarView string resource. */
export const svStrings = (resources: Resources, id: number): string[] => strings(resource(resources, SV_STRING, id));

/** Writes `image` as a PNG to `src/assets/<path>`. */
export async function png(path: string, image: Image): Promise<void> {
  await mkdir(dirname(join(ASSETS, path)), { recursive: true });
  await writeFile(join(ASSETS, path), encodePng(image));
}

/** Writes `value` as JSON to `src/assets/<path>`. */
export async function json(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(join(ASSETS, path)), { recursive: true });
  await writeFile(join(ASSETS, path), JSON.stringify(value, null, 2) + '\n');
}

/**
 * The original sprites are bitmaps of twice their size: the image, then its transparency mask
 * (white = transparent) below it or on its right. Becomes the image with an alpha channel.
 */
export function masked(bitmap: Image, maskAt: 'below' | 'right'): Image {
  const below = maskAt === 'below';
  const [w, h] = below ? [bitmap.width, bitmap.height / 2] : [bitmap.width / 2, bitmap.height];
  return withMask(crop(bitmap, 0, 0, w, h), below ? crop(bitmap, 0, h, w, h) : crop(bitmap, w, 0, w, h));
}

/** `image` made transparent where `mask` is white (separate mask bitmaps). */
export function withMask(image: Image, mask: Image): Image {
  const out = { ...image, rgba: image.rgba.slice() };
  for (let i = 0; i < image.width * image.height; i++) {
    if (mask.rgba[i * 4] === 255) out.rgba.set([0, 0, 0, 0], i * 4);
  }
  return out;
}

export { crop, type Image };
