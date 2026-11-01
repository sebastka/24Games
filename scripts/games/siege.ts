// Siege: the card holders under the foundations and the wings. See docs/games/siege.md.
import { bitmap, load, png, withMask } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('siege.exe');
  // cardhld1/2/3.bmp (Windows bitmaps 257, 259, 261), each with its mask cardhlm1/2/3.bmp
  // (258, 260, 262): the holder of a foundation, of a left wing pile, of a right wing pile.
  for (const [i, name] of ['foundation', 'left', 'right'].entries()) {
    await png(`siege/holder-${name}.png`, withMask(bitmap(exe, 257 + 2 * i), bitmap(exe, 258 + 2 * i)));
  }
}
