// Playing cards shared by the card games (Poker Patience, Siege, Vanishing Cross, Poker Machine):
// the card backs with their rounded corners cut out, and the blank card face. The rest of a card
// (pips, indices, court figures) is drawn from CZGAME32.DLL's bitmaps as they are, like the
// originals do. See src/shell/cards/draw.ts.
import { bitmap, load, png, type Image } from '../lib/assets.ts';

/** Card size in pixels. */
const W = 71;
const H = 96;

export default async function extract(): Promise<void> {
  const cz = await load('czgame32.dll');
  // backs.bmp (Windows bitmap 280): the 14 backs side by side; backmask.bmp (288): black where a
  // card is, white in its four rounded corners. The games blit a back through the mask.
  const backs = bitmap(cz, 280);
  const mask = bitmap(cz, 288);
  if (backs.width !== 14 * W || mask.width !== W) throw new Error('unexpected card bitmaps');
  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < W && y < H && mask.rgba[(y * W + x) * 4] === 0;

  const out: Image = { ...backs, rgba: backs.rgba.slice() };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < backs.width; x++) {
      if (!inside(x % W, y)) out.rgba[(y * backs.width + x) * 4 + 3] = 0;
    }
  }
  await png('cards/backs.png', out);

  // The face: OutputDevice::DrawRect with rounded corners, a black pen and a white brush, over
  // the card's rectangle. Its outline is the mask's: the edge pixels of the card's shape.
  const face: Image = { width: W, height: H, rgba: new Uint8Array(W * H * 4) };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      face.rgba.set(edge ? [0, 0, 0, 255] : [255, 255, 255, 255], (y * W + x) * 4);
    }
  }
  await png('cards/face.png', face);
}
