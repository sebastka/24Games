// Wari: the "WARI" logo drawn in the middle of the board. See docs/games/wari.md.
import { bitmap, load, masked, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('wari.exe');
  // StarView bitmap 256 (wari.bmp, Windows bitmap 257): 280×80, its mask below.
  await png('wari/logo.png', masked(bitmap(exe, 257), 'below'));
}
