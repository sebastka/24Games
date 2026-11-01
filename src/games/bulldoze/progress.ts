// Level progression of Bulldozer: 60 levels, then the "THE END" screen; a password for every
// fourth level, to start there later (Game › Options › Starting Level).

export const LAST_LEVEL = 60;
/** The "THE END" screen after the last level, which can be driven around but not completed. */
export const END_SCREEN = 61;

/**
 * Passwords of levels 4, 8, … 56, as the original stores them (each letter + 1, so that they do
 * not show up in the executable's strings): "CPOL" is BONK.
 */
const STORED = [
  'CPOL',
  'OFSE',
  'CVSQ',
  'TQVE',
  'HSPL',
  'TQPU',
  'LBMF',
  'QPET',
  'UBQT',
  'LSJM',
  'HOJQ',
  'HPSO',
  'MPVU',
  'JBPN',
];
const PASSWORDS = STORED.map((p) => String.fromCharCode(...[...p].map((c) => c.charCodeAt(0) - 1)));

/** The levels that can be chosen as starting level: 1 (no password), 4, 8, … 56. */
export const STARTING_LEVELS = [1, ...PASSWORDS.map((_, i) => (i + 1) * 4)];

/** The password of `level` (4, 8, … 56), or null. */
export function password(level: number): string | null {
  return level % 4 === 0 ? (PASSWORDS[level / 4 - 1] ?? null) : null;
}

/** Whether `typed` opens `level` (the original upper-cases what was typed). */
export const checkPassword = (level: number, typed: string): boolean =>
  level === 1 || password(level) === typed.trim().toUpperCase();

/**
 * What completing `level` shows: the final congratulations after level 60, the next level's
 * password before levels 4, 8, … 56, a plain "you have completed level n" otherwise.
 *
 * The original also gives a "password" after level 59, read past the end of its table (garbage
 * characters): it is useless, since 60 is not a starting level, and is shown as a plain
 * completion here.
 */
export type Completion = { kind: 'final' } | { kind: 'password'; password: string } | { kind: 'level' };

export function completion(level: number): Completion {
  if (level === LAST_LEVEL) return { kind: 'final' };
  const next = password(level + 1);
  return next ? { kind: 'password', password: next } : { kind: 'level' };
}
