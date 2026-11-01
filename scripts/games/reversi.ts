// Reversi Plus: the title logo of the side panel. See docs/games/reversi.md.
import { bitmap, load, masked, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('reversi.exe');
  // reversi.bmp: the "Reversi Plus" title (167×67), its mask on the right.
  await png('reversi/logo.png', masked(bitmap(exe, 257), 'right'));
}
