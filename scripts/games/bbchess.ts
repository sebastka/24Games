// Black Box Chess: the five pieces (king, queen, rook, knight, bishop). The boards are the shared
// ones of CZGAME32.DLL. See docs/games/bbchess.md.
import { bitmap, load, masked, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('bbchess.exe');
  // StarView bitmap 256 (pieces.bmp), Windows bitmap 257: five 32×32 pieces, masks below.
  await png('bbchess/pieces.png', masked(bitmap(exe, 257), 'below'));
}
