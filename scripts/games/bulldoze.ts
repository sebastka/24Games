// Bulldozer: levels and piece sets. See docs/games/bulldoze.md.
import { bitmap, json, load, masked, png, svStrings } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('bulldoze.exe');
  // Levels 1-60 are resources 301-360; 361 is the "THE END" screen shown after level 60. Each is
  // 240 hexadecimal digits, one per tile, row by row (12 rows of 20 columns).
  const levels = [];
  for (let id = 301; id <= 361; id++) {
    const [tiles = ''] = svStrings(exe, id);
    if (!/^[0-9A-F]{240}$/.test(tiles)) throw new Error(`level ${id}: ${tiles}`);
    levels.push(Array.from({ length: 12 }, (_, y) => tiles.slice(y * 20, y * 20 + 20)));
  }
  await json('bulldoze/levels.json', levels);
  await png('bulldoze/pieces-color.png', masked(bitmap(exe, 257), 'below'));
  await png('bulldoze/pieces-mono.png', masked(bitmap(exe, 258), 'below'));
}
