// Cryptograms: the phrase files and the background. See docs/games/crypto.md.
import { bitmap, json, load, png, raw } from '../lib/assets.ts';

/**
 * A phrase file (crypto1.dat, crypto2.dat): one phrase per line, each starting with '#', lines
 * ending with CR LF. The game picks a phrase by seeking to a random offset and taking the first
 * '#' from there (wrapping to the start of the file), so each phrase keeps its offset, and the
 * file its size. Lines without '#' (crypto2.dat has a stray "thew Arnold") are never picked.
 */
function phrases(data: Buffer): { size: number; phrases: [number, string][] } {
  const text = data.toString('latin1');
  const list: [number, string][] = [];
  for (let at = text.indexOf('#'); at >= 0; at = text.indexOf('#', at + 1)) {
    const end = text.indexOf('\r', at);
    const phrase = text.slice(at + 1, end < 0 ? undefined : end);
    if (!/^[ -~]+$/.test(phrase)) throw new Error(`unexpected phrase at ${at}: ${phrase}`);
    list.push([at, phrase]);
  }
  return { size: data.length, phrases: list };
}

export default async function extract(): Promise<void> {
  // Easy and Difficult use crypto1.dat (longer phrases), Moderate and Expert crypto2.dat.
  await json('crypto/phrases1.json', phrases(await raw('crypto1.dat')));
  await json('crypto/phrases2.json', phrases(await raw('crypto2.dat')));
  // The play field's background (StarView bitmap 256, crypt.bmp), 640×300.
  await png('crypto/background.png', bitmap(await load('crypto.exe'), 257));
}
