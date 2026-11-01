// The C runtime's rand(), which every original draws its numbers from (FUN_0040d947 in
// reversi.exe, the same MSVC code linked into each game), seeded with the time at start. The
// games take it as an injected function, so that tests are deterministic and games replayable.

/** MSVC's `rand()`: an integer in 0…32767. */
export type Rand = () => number;

/** The C runtime's `rand()`, seeded like `srand(seed)`. */
export function msvcRand(seed: number): Rand {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 0x343fd) + 0x269ec3) >>> 0;
    return (state >>> 16) & 0x7fff;
  };
}

/** A `rand()` drawn from Math.random (games that need no replay). */
export const randomRand: Rand = () => Math.floor(Math.random() * 32768);

/** One `rand()` drawn from a random function in [0, 1) (the games injecting Math.random). */
export const rand = (random: () => number): number => Math.floor(random() * 32768);
