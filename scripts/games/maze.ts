// MazeRace: the maze's pieces and the win dialog's mice. See docs/games/maze.md.
import { bitmap, crop, load, png, withMask } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('maze.exe');
  // pieces.bmp: the cheese, Hector facing left and right, Nestor facing left and right, a player
  // thrower (white dot) and an opponent thrower (black dot), 32×32 each, drawn opaque (stretched
  // to the maze's cells).
  await png('maze/pieces.png', bitmap(exe, 257));
  // piece2.bmp: Hector and Nestor (29×31), then their common mask: the win dialog's frame.
  const mice = bitmap(exe, 258);
  const mask = crop(mice, 58, 0, 29, 31);
  await png('maze/hector.png', withMask(crop(mice, 0, 0, 29, 31), mask));
  await png('maze/nestor.png', withMask(crop(mice, 29, 0, 29, 31), mask));
}
