// Pegopolis: the 23 layouts (boards, rules, goal patterns, descriptions) and their previews. The
// boards and pieces are the shared ones of CZGAME32.DLL. See docs/games/pegoplis.md.
import { bitmap, json, load, png, svStrings } from '../lib/assets.ts';
import { resource } from '../lib/pe.ts';

/** StarView resource type of bitmaps: their file name and Windows bitmap id. */
const SV_BITMAP = 275;

export interface Layout {
  name: string;
  width: number;
  height: number;
  /** The four flags after the size: unused, straight jumps, diagonal jumps, score (else pattern). */
  flags: [boolean, boolean, boolean, boolean];
  /** Rows of cell codes 0-6 (see docs). */
  start: string[];
  /** The pattern to reach (pattern layouts only). */
  goal?: string[];
  /** The description shown in the window, lines separated by "\n". */
  text: string;
}

/**
 * A layout (`FUN_004033b0`), StarView string 500 + n: width and height digits, four flag
 * digits, then the cells (digits 0-6, other characters skipped), and as many again for the goal
 * pattern when the last flag is 0.
 */
function layout(name: string, data: string, text: string): Layout {
  const digits = (s: string) => [...s].map((c) => Number(c));
  const [width = 0, height = 0, ...flags] = digits(data.slice(0, 6));
  const cells = [...data.slice(6)].filter((c) => c >= '0' && c <= '6').join('');
  const rows = (from: number) =>
    Array.from({ length: height }, (_, y) => cells.slice(from + y * width, from + (y + 1) * width));
  const score = flags[3] === 1;
  const need = width * height * (score ? 1 : 2);
  if (cells.length < need) throw new Error(`layout ${name}: ${cells.length} cells`);
  return {
    name,
    width,
    height,
    flags: flags.map((f) => f === 1) as Layout['flags'],
    start: rows(0),
    ...(score ? {} : { goal: rows(width * height) }),
    text,
  };
}

export default async function extract(): Promise<void> {
  const exe = await load('pegoplis.exe');
  const names = svStrings(exe, 256)[0]!.split(',');
  const layouts = names.map((name, n) => {
    const [data = ''] = svStrings(exe, 500 + n);
    return layout(name, data, svStrings(exe, 600 + n).join(''));
  });
  await json('pegoplis/layouts.json', layouts);
  // The 80×80 previews (Layout Preview, Goal Pattern): StarView bitmaps 500 + n.
  for (let n = 0; n < names.length; n++) {
    const sv = resource(exe, SV_BITMAP, 500 + n);
    await png(`pegoplis/preview-${n}.png`, bitmap(exe, 256 + sv[10]!));
  }
}
