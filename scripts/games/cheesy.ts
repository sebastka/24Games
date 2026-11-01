// Cheesy Pursuit: the cat, the mice and the cheeses. See docs/games/cheesy.md.
import { bitmap, crop, load, png, withMask, type Image } from '../lib/assets.ts';

/** Sprites side by side, each followed by its mask (white = transparent) on its right. */
function pairs(sheet: Image, size: number): Image[] {
  return Array.from({ length: sheet.width / (2 * size) }, (_, i) =>
    withMask(crop(sheet, 2 * i * size, 0, size, sheet.height), crop(sheet, (2 * i + 1) * size, 0, size, sheet.height)),
  );
}

/** Images of the same height, side by side. */
function row(images: Image[]): Image {
  const width = images.reduce((w, i) => w + i.width, 0);
  const height = images[0]!.height;
  const rgba = new Uint8Array(width * height * 4);
  let x = 0;
  for (const image of images) {
    for (let y = 0; y < height; y++) {
      rgba.set(image.rgba.subarray(y * image.width * 4, (y + 1) * image.width * 4), (y * width + x) * 4);
    }
    x += image.width;
  }
  return { width, height, rgba };
}

export default async function extract(): Promise<void> {
  const exe = await load('cheesy.exe');
  // cat.bmp: one 36×36 cat, its mask on the right.
  await png('cheesy/cat.png', row(pairs(bitmap(exe, 257), 36)));
  // mice.bmp: Hector facing left and right, Nestor facing left and right, then the masks of a
  // mouse facing left and right (both mice have the same outline).
  const mice = bitmap(exe, 258);
  const masks = [crop(mice, 128, 0, 32, 32), crop(mice, 160, 0, 32, 32)];
  await png('cheesy/mice.png', row([0, 1, 2, 3].map((i) => withMask(crop(mice, i * 32, 0, 32, 32), masks[i % 2]!))));
  // cheese.bmp: cheddar, gouda and the CheeseBomb, each followed by its mask.
  await png('cheesy/cheese.png', row(pairs(bitmap(exe, 259), 32)));
}
