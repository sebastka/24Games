// Extracts the assets the web version uses from the original Windows 95 files (original/win95/
// program) into src/assets, as web-friendly files: PNG instead of BMP/ICO resources, JSON
// instead of StarView resources. The output is committed; run again after changing a script:
//
//   npm run assets              # everything
//   npm run assets -- bulldoze  # one game's assets only (src/assets/bulldoze)
//
// Shared assets (catalogue, icons, backgrounds, sounds…) are extracted here; each game's own in
// scripts/games/<game>.ts, into src/assets/<game>/. Where each comes from is documented in
// docs/reverse-engineering.md and docs/games/<game>.md.
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS, bitmap, json, load, masked, ORIGINAL, png, svStrings } from './lib/assets.ts';
import { decodeIcon, groupIconId, type Image } from './lib/dib.ts';
import { resource, RT, type Resources } from './lib/pe.ts';

/** StarView resource type of bitmaps: their file name and Windows bitmap id. */
const SV_BITMAP = 275;

function icon(resources: Resources): Image {
  const group = resources.get(RT.GROUP_ICON)?.values().next().value;
  if (!group) throw new Error('no icon group');
  return decodeIcon(resource(resources, RT.ICON, groupIconId(group)));
}

async function catalog(games: Resources): Promise<void> {
  const entries = [];
  for (let id = 300; id < 324; id++) {
    const [first = '', ...more] = svStrings(games, id);
    const [title, exe, category, blurb, ...rules] = first.split('|');
    if (!title || !exe || !category || !blurb) throw new Error(`catalogue entry ${id}: ${first}`);
    entries.push({ id: exe, title, category, blurb, rules: [...rules, ...more] });
    await png(`icons/${exe}.png`, icon(await load(`${exe}.exe`)));
    // The launcher's list shows a 16×16 bitmap per game, in catalogue order.
    await png(`icons/${exe}-16.png`, bitmap(games, id - 42));
  }
  await json('catalog.json', entries);
  await png('icons/games.png', icon(games));
}

async function shared(): Promise<void> {
  for (const dir of ['icons', 'backgrounds', 'shared', 'sounds', 'catalog.json']) {
    await rm(join(ASSETS, dir), { recursive: true, force: true });
  }
  const games = await load('games.exe');
  await catalog(games);
  const cz = await load('czgame32.dll');
  // Window backgrounds 16-30 (StarView bitmaps 1100-1114 = pat1.bmp … pat15.bmp).
  for (let n = 1; n <= 15; n++) await png(`backgrounds/${n}.png`, bitmap(cz, 262 + n));
  // The spiral binding of the options dialogs' notebook (tab_spi.bmp, tab_end.bmp).
  await png('shared/spiral.png', masked(bitmap(cz, 261), 'right'));
  await png('shared/spiral-end.png', masked(bitmap(cz, 262), 'right'));
  await png('shared/codezone.png', bitmap(cz, 257));
  await png('shared/splash.png', bitmap(games, 257));

  // Every bitmap of CZGAME32.DLL under its original name (cards, piece sets, boards, the win/lose
  // dialogs' art…), as is: masks, when a bitmap has one, are left in (see docs). Its StarView
  // bitmap resources (type 275) hold the name and, at byte 10, the Windows bitmap: 256 + byte.
  for (const res of cz.get(SV_BITMAP)?.values() ?? []) {
    const name = new TextDecoder('latin1').decode(res.subarray(12)).split('\0')[0]!;
    if (!/^[a-z0-9_]+\.bmp$/.test(name)) throw new Error(`unexpected bitmap name ${name}`);
    if (name.startsWith('pat')) continue; // the backgrounds, above
    await png(`shared/czgame/${name.replace('.bmp', '.png')}`, bitmap(cz, 256 + res[10]!));
  }

  // Sounds are shared by all games and already compact (8-bit PCM WAV): copied as they are.
  await mkdir(join(ASSETS, 'sounds'), { recursive: true });
  for (const file of await readdir(ORIGINAL)) {
    if (file.endsWith('.wav')) await copyFile(join(ORIGINAL, file), join(ASSETS, 'sounds', file));
  }
}

async function game(id: string): Promise<void> {
  const module = (await import(`./games/${id}.ts`)) as { default: () => Promise<void> };
  await rm(join(ASSETS, id), { recursive: true, force: true });
  await module.default();
}

const only = process.argv.slice(2);
if (only.length === 0) {
  await shared();
  for (const file of (await readdir(join(import.meta.dirname, 'games'))).sort()) {
    if (file.endsWith('.ts')) await game(file.slice(0, -3));
  }
} else {
  for (const id of only) await game(id);
}
console.log(`assets written to ${ASSETS}`);
