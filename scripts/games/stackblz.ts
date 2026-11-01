// StackBlitz: piece sets and the bonus icons. See docs/games/stackblz.md.
import { bitmap, crop, load, png, svStrings, type Image } from '../lib/assets.ts';

/** Copies `src` into `dst` at (x, y). */
function blit(dst: Image, src: Image, x: number, y: number): void {
  for (let row = 0; row < src.height; row++) {
    const from = row * src.width * 4;
    dst.rgba.set(src.rgba.subarray(from, from + src.width * 4), ((y + row) * dst.width + x) * 4);
  }
}

export default async function extract(): Promise<void> {
  const exe = await load('stackblz.exe');
  // Piece set names: StarView strings 256 ("Circles,Squares,…"), one per StarView bitmap 300-306
  // (Windows bitmaps 260-266, 6 pieces of 32×32 each).
  const names = svStrings(exe, 256)[0]!.split(',');
  if (names.length !== 7) throw new Error(`piece set names: ${names.join()}`);
  // As the game composes its 320×32 piece strip (FUN_00407c80): piece code n at x = 32n. Code 0
  // (the empty cell) and 7-9 (the specials) come from piecex.bmp (Windows bitmap 259: empty,
  // then the three specials); 1-6 from the chosen set. One row per set.
  const specials = bitmap(exe, 259);
  const sheet: Image = { width: 320, height: 32 * names.length, rgba: new Uint8Array(320 * 32 * names.length * 4) };
  names.forEach((_, set) => {
    blit(sheet, crop(specials, 0, 0, 32, 32), 0, set * 32);
    blit(sheet, bitmap(exe, 260 + set), 32, set * 32);
    blit(sheet, crop(specials, 32, 0, 96, 32), 224, set * 32);
  });
  await png('stackblz/pieces.png', sheet);
  // The horizontal and diagonal stack icons of the score table (b_horz.bmp, b_diag.bmp).
  await png('stackblz/horizontal.png', bitmap(exe, 257));
  await png('stackblz/diagonal.png', bitmap(exe, 258));
}
