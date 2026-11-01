// Voracity: the six tile sets. See docs/games/voracity.md.
import { bitmap, load, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('voracity.exe');
  // StarView bitmaps 256-261 (Windows bitmaps 257-262), in the order of the Pieces list (Plain,
  // Red, Green, Blue, Colorful, Monochrome): 176×16, eleven 16×16 tiles: an eaten square, the
  // digits 1-9, the target.
  for (let n = 0; n < 6; n++) await png(`voracity/tiles-${n}.png`, bitmap(exe, 257 + n));
}
