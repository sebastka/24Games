// Vanishing Cross: the card holders. See docs/games/vcross.md.
import { bitmap, load, png, withMask } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('vcross.exe');
  // cardhld1/2/3.bmp (Windows bitmaps 257, 259, 260) through the one mask cardhlm1.bmp (258):
  // the holder of the stock and the waste, of a cross pile, of a foundation (an X).
  const mask = bitmap(exe, 258);
  await png('vcross/holder-stock.png', withMask(bitmap(exe, 257), mask));
  await png('vcross/holder-cross.png', withMask(bitmap(exe, 259), mask));
  await png('vcross/holder-foundation.png', withMask(bitmap(exe, 260), mask));
}
