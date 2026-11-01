// Engulf: the board layouts and the title logo. See docs/games/engulf.md.
import { bitmap, json, load, masked, png, svStrings } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('engulf.exe');
  // Layouts 1-35 are strings 256-290 (291 is loaded but never used): pairs of digits "xy", each
  // a blocked square. Kept as 7 rows of '#' (blocked) and '.'.
  const layouts = [];
  for (let id = 256; id <= 290; id++) {
    const [pairs = ''] = svStrings(exe, id);
    if (!/^(\d\d)*$/.test(pairs)) throw new Error(`layout ${id}: ${pairs}`);
    const rows = Array.from({ length: 7 }, () => [...'.......']);
    for (let i = 0; i < pairs.length; i += 2) rows[Number(pairs[i + 1])]![Number(pairs[i])] = '#';
    layouts.push(rows.map((r) => r.join('')));
  }
  await json('engulf/layouts.json', layouts);
  // logo.bmp (bitmap 257): the "Engulf" title, 154×34, its mask below.
  await png('engulf/logo.png', masked(bitmap(exe, 257), 'below'));
}
