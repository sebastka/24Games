// Think Tank: tanks, pellets, walls, explosions and the logo. See docs/games/thinktnk.md.
import { bitmap, crop, load, masked, png, withMask, type Image } from '../lib/assets.ts';

/** Images of the same height, side by side. */
function row(images: Image[]): Image {
  const width = images.reduce((w, i) => w + i.width, 0);
  const height = images[0]!.height;
  const rgba = new Uint8Array(width * height * 4);
  let x = 0;
  for (const image of images) {
    for (let y = 0; y < height; y++) {
      rgba.set(image.rgba.subarray(y * image.width * 4, (y + 1) * image.width * 4), (y * width + x) * 4);
    }
    x += image.width;
  }
  return { width, height, rgba };
}

export default async function extract(): Promise<void> {
  const exe = await load('thinktnk.exe');
  // enemy.bmp: the enemy tank facing left, right, up and down (18×18), then one mask. The game
  // takes the mask one pixel early (at x = 71, `FUN_0040a250`): kept, for the same outline.
  const enemy = bitmap(exe, 257);
  const enemyMask = crop(enemy, 71, 0, 18, 18);
  await png('thinktnk/enemy.png', row([0, 1, 2, 3].map((i) => withMask(crop(enemy, i * 18, 0, 18, 18), enemyMask))));
  // misc.bmp: the five pellets (12×12, drawn opaque), then the bullet (4×4) and its mask.
  const misc = bitmap(exe, 258);
  await png('thinktnk/pellets.png', crop(misc, 0, 0, 60, 12));
  await png('thinktnk/bullet.png', withMask(crop(misc, 60, 0, 4, 4), crop(misc, 64, 0, 4, 4)));
  // player.bmp: the player's tank facing left, right, up and down, masks below.
  await png('thinktnk/player.png', masked(bitmap(exe, 259), 'below'));
  // walls.bmp: eight looks of the 18×18 blocks, drawn opaque.
  await png('thinktnk/walls.png', bitmap(exe, 260));
  // explode.bmp: five frames of 32×32, masks below.
  await png('thinktnk/explode.png', masked(bitmap(exe, 261), 'below'));
  // logo.bmp: "THINK TANK", mask below.
  await png('thinktnk/logo.png', masked(bitmap(exe, 262), 'below'));
}
