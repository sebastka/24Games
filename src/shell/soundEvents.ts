// The sound events of a game, as Options › Extras lists them (pure: the tests use them; the
// sounds themselves are in sound.ts).

/** A game's sound settings (Options › Extras): a sound name (or '') per event. */
export interface SoundSettings {
  soundEnabled: boolean;
  sounds: Record<string, string>;
}

/**
 * A game's sound events, after "<title> Start" and "<title> Exit": every original registers
 * these two first, without a default sound (in its window's constructor, before its own events:
 * bulldoze.exe FUN_00403ff0). sound.ts's useStartExit plays them.
 */
export function soundEvents<const Title extends string, const T extends Record<string, string>>(
  title: Title,
  events: T,
): Record<`${Title} Start` | `${Title} Exit`, string> & T {
  return { [`${title} Start`]: '', [`${title} Exit`]: '', ...events } as Record<
    `${Title} Start` | `${Title} Exit`,
    string
  > &
    T;
}
