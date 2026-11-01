// Push-Pull: the "PushPull" logo and the marker. See docs/games/pushpull.md.
import { bitmap, crop, load, masked, png, withMask } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('pushpull.exe');
  // StarView bitmap 257 (logo.bmp, Windows bitmap 258): 185×54, the logo and its mask below.
  await png('pushpull/logo.png', masked(bitmap(exe, 258), 'below'));
  // StarView bitmap 256 (marks.bmp, Windows bitmap 257): 128×32, the mark of a visited square
  // and its mask, then the marker and its mask.
  const marks = bitmap(exe, 257);
  await png('pushpull/visited.png', withMask(crop(marks, 0, 0, 32, 32), crop(marks, 32, 0, 32, 32)));
  await png('pushpull/marker.png', withMask(crop(marks, 64, 0, 32, 32), crop(marks, 96, 0, 32, 32)));
}
