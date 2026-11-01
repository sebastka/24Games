// CardMatch: the card faces, the card back, the "found" card and the pointer shown over cards.
// See docs/games/match.md.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS, bitmap, load, png } from '../lib/assets.ts';
import { resource } from '../lib/pe.ts';

const RT_CURSOR = 1;

/** A .cur file from an RT_CURSOR resource (its hotspot, then a DIB with its AND mask). */
function cursorFile(res: Uint8Array): Uint8Array {
  const view = new DataView(res.buffer, res.byteOffset, res.byteLength);
  const [hotX, hotY] = [view.getUint16(0, true), view.getUint16(2, true)];
  const dib = res.subarray(4);
  const width = new DataView(dib.buffer, dib.byteOffset).getInt32(4, true);
  const height = new DataView(dib.buffer, dib.byteOffset).getInt32(8, true) / 2;
  const out = new Uint8Array(6 + 16 + dib.length);
  const o = new DataView(out.buffer);
  o.setUint16(2, 2, true); // type: cursor
  o.setUint16(4, 1, true); // one image
  out[6] = width;
  out[7] = height;
  o.setUint16(10, hotX, true);
  o.setUint16(12, hotY, true);
  o.setUint32(14, dib.length, true);
  o.setUint32(18, 22, true);
  out.set(dib, 22);
  return out;
}

export default async function extract(): Promise<void> {
  const exe = await load('match.exe');
  // StarView bitmaps 256-259 (cards.bmp, aliens.bmp, blankcrd.bmp, found.bmp) are Windows
  // bitmaps 257-260. The faces are 6×3 cards of 100×100.
  await png('match/cards.png', bitmap(exe, 257));
  await png('match/aliens.png', bitmap(exe, 258));
  await png('match/back.png', bitmap(exe, 259));
  await png('match/found.png', bitmap(exe, 260));
  // The pointer over a card that can be turned: plus.cur of CZGAME32.DLL (StarView pointer 1000).
  const cz = await load('czgame32.dll');
  await writeFile(join(ASSETS, 'match/plus.cur'), cursorFile(resource(cz, RT_CURSOR, 1)));
}
