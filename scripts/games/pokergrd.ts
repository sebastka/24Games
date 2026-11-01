// Poker Patience: the arrow between the two piles. See docs/games/pokergrd.md.
import { bitmap, load, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('pokergrd.exe');
  // arrows.bmp: two 24×24 arrows, pointing right then left (the selected pile).
  await png('pokergrd/arrows.png', bitmap(exe, 257));
}
