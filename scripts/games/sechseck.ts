// Sechseck: the piece background, the shapes and the skull / multiplier tiles. See
// docs/games/sechseck.md.
import { bitmap, crop, load, masked, png, withMask, type Image } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('sechseck.exe');
  // bits.bmp (Windows bitmap 257, 64×80): 4 shapes (columns) × 4 colours (rows) of 16×16, then
  // one row of masks, one per shape (FUN_0040b7e0).
  const bits = bitmap(exe, 257);
  const masks: Image = { width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) };
  for (let row = 0; row < 4; row++) masks.rgba.set(crop(bits, 0, 64, 64, 16).rgba, row * 64 * 16 * 4);
  await png('sechseck/shapes.png', withMask(crop(bits, 0, 0, 64, 64), masks));
  // mult.bmp (258, 128×64): skull, ×2, ×3, ×4, 32×32, masks below.
  await png('sechseck/tiles.png', masked(bitmap(exe, 258), 'below'));
  // piece.bmp (259, 74×40): the grey hexagon under a piece, mask on the right.
  await png('sechseck/piece.png', masked(bitmap(exe, 259), 'right'));
}
