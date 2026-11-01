// Quinto: the arrow of the "from → to" legend and the logo. The boards and pieces are the shared
// ones of CZGAME32.DLL (src/assets/shared/czgame/board.png, piece_*.png). See docs/games/quinto.md.
import { bitmap, load, masked, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('quinto.exe');
  // StarView bitmaps 256 (arrow.bmp) and 257 (logo.bmp) are Windows bitmaps 257 and 258, each
  // the picture with its mask on the right.
  await png('quinto/arrow.png', masked(bitmap(exe, 257), 'right'));
  await png('quinto/logo.png', masked(bitmap(exe, 258), 'right'));
}
