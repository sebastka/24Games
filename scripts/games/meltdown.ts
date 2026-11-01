// Core Meltdown: the title logo of the side panel. See docs/games/meltdown.md.
import { bitmap, load, masked, png } from '../lib/assets.ts';

export default async function extract(): Promise<void> {
  const exe = await load('meltdown.exe');
  // logo.bmp (bitmap 257): "Core Meltdown", 204×60, its mask below.
  await png('meltdown/logo.png', masked(bitmap(exe, 257), 'below'));
}
