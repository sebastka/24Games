// Rules of Cryptograms, as the original crypto.exe implements them (see docs/games/crypto.md for
// the functions this follows). Pure and immutable: every action returns a new state.

/** Skill levels (SkillLevel): 1 Easy, 2 Moderate, 3 Difficult, 4 Expert. */
export type Skill = 1 | 2 | 3 | 4;

/** A phrase file as extracted: its size, and each phrase with the offset of its '#'. */
export interface PhraseFile {
  size: number;
  phrases: [number, string][];
}

/** Easy and Difficult take their phrases from crypto1.dat (longer ones), the others from crypto2.dat. */
export const phraseFileOf = (skill: Skill): 1 | 2 => (skill === 1 || skill === 3 ? 1 : 2);

/** The C library's rand(): 0 to 32767, from an injected random function. */
export const rand = (random: () => number): number => Math.floor(random() * 32768);

/**
 * The phrase picked (`FUN_00401320`): the file is read from `(rand() * 0x7fffffff + rand()) %
 * size`, computed on signed 32 bits. About half the time that is negative, the seek fails and the
 * file is read from its start: the first phrase comes up in half the games. Otherwise, the first
 * '#' from the offset, wrapping around to the start of the file.
 */
export function pickPhrase(file: PhraseFile, random: () => number): string {
  const r1 = rand(random);
  const r2 = rand(random);
  const offset = ((Math.imul(r1, 0x7fffffff) + r2) | 0) % file.size;
  const at = offset < 0 ? 0 : offset;
  const found = file.phrases.find(([position]) => position >= at) ?? file.phrases[0]!;
  return found[1];
}

/**
 * The phrase as played: on Difficult and Expert, without its spaces, then cut every 26
 * characters (a space inserted after each run of 26).
 */
export function arrange(phrase: string, skill: Skill): string {
  if (skill === 1 || skill === 2) return phrase;
  const letters = phrase.replaceAll(' ', '');
  const parts = [];
  for (let i = 0; i < letters.length; i += 26) parts.push(letters.slice(i, i + 26));
  return parts.join(' ');
}

/**
 * The secret alphabet (`FUN_00402c80`): the identity, each place in turn swapped with a random
 * one (a letter can stand for itself).
 */
export function shuffleKey(random: () => number): number[] {
  const key = Array.from({ length: 26 }, (_, i) => i);
  for (let i = 0; i < 26; i++) {
    const j = rand(random) % 26;
    [key[i], key[j]] = [key[j]!, key[i]!];
  }
  return key;
}

const isUpper = (c: string) => c >= 'A' && c <= 'Z';
const isLower = (c: string) => c >= 'a' && c <= 'z';
const isLetter = (c: string) => isUpper(c) || isLower(c);

/** `text` in the secret alphabet (`FUN_00402cc0`), keeping case and everything else. */
export function encode(text: string, key: readonly number[]): string {
  return [...text]
    .map((c) => {
      if (isUpper(c)) return String.fromCharCode(65 + key[c.charCodeAt(0) - 65]!);
      if (isLower(c)) return String.fromCharCode(97 + key[c.charCodeAt(0) - 97]!);
      return c;
    })
    .join('');
}

/** A letter box: the guess above, the coded letter below. */
export interface Cell {
  /** Coded character ('' for a space: no box). */
  code: string;
  /** The guess ('' or ' ' for none); punctuation shows itself. */
  guess: string;
  /** Punctuation, or a letter given by a hint: shown in black, without its coded letter. */
  fixed: boolean;
  selected: boolean;
  x: number;
  y: number;
}

export const CELL_WIDTH = 22;
export const CELL_HEIGHT = 45;
const STEP = 24;
const LINE = 50;
const RIGHT = 639;

export interface State {
  /** The phrase as played (its characters, cell by cell). */
  plain: string;
  cells: readonly Cell[];
  /** Hints asked for. */
  hints: number;
  /** False once solved or given up: clicks beep, keys do nothing. */
  active: boolean;
}

/**
 * A new puzzle (`FUN_00401320`): a box per character but spaces, 24 pixels apart, from (8, 2);
 * a word that would end past x = 639 goes to the next line, 50 pixels lower.
 */
export function start(plain: string, key: readonly number[]): State {
  const code = encode(plain, key);
  const cells: Cell[] = [];
  let x = 8;
  let y = 2;
  for (let i = 0; i < code.length; i++) {
    const c = code[i]!;
    const letter = isLetter(c);
    cells.push({
      code: c === ' ' ? '' : c,
      guess: c === ' ' || letter ? '' : plain[i]!,
      fixed: c !== ' ' && !letter,
      selected: false,
      x,
      y,
    });
    if (c === ' ') {
      // The word after the space, the space included.
      let end = i + 1;
      while (end < code.length && code[end] !== ' ') end++;
      if (x + (end - i) * STEP >= RIGHT) {
        x = 8;
        y += LINE;
        continue;
      }
    }
    x += STEP;
  }
  return { plain, cells, hints: 0, active: true };
}

/** A whole new game: a new key, a phrase of the skill level's file. */
export function newGame(file: PhraseFile, skill: Skill, random: () => number = Math.random): State {
  const key = shuffleKey(random);
  return start(arrange(pickPhrase(file, random), skill), key);
}

export const isSolved = (state: State): boolean =>
  [...state.plain].every((c, i) => !isLetter(c) || state.cells[i]!.guess === c);

/**
 * The box at (`x`, `y`) of the play field, or -1. With a `slop` (for fingers), the nearest box
 * whose edge is at most that far.
 */
export function cellAt(state: State, x: number, y: number, slop = 0): number {
  let best = -1;
  let bestDistance = Infinity;
  state.cells.forEach((c, i) => {
    if (c.code === '') return;
    const dx = Math.max(c.x - x, 0, x - (c.x + CELL_WIDTH));
    const dy = Math.max(c.y - y, 0, y - (c.y + CELL_HEIGHT));
    const distance = Math.hypot(dx, dy);
    if (distance <= slop && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * A click (`FUN_00401e80`): beeps when the game is over. Otherwise every box is deselected but
 * the one clicked; if it is a coded letter, every box of that letter is selected ("Click a Cell").
 */
export function select(state: State, i: number): { state: State; event: 'select' | 'beep' | null } {
  if (!state.active) return { state, event: 'beep' };
  const hit = i >= 0 && !state.cells[i]!.fixed ? state.cells[i]!.code.toUpperCase() : '';
  const cells = state.cells.map((c) => ({ ...c, selected: hit !== '' && c.code.toUpperCase() === hit && !c.fixed }));
  return { state: { ...state, cells }, event: hit ? 'select' : null };
}

/**
 * A key (`FUN_00401a80`): a letter not already guessed anywhere, or a space (which clears),
 * goes into the selected boxes, in the case of their coded letter. Null if nothing changed.
 */
export function type(state: State, key: string): State | null {
  if (!state.active || key.length !== 1) return null;
  const k = key.toUpperCase();
  if (k !== ' ' && !(k >= 'A' && k <= 'Z')) return null;
  if (k !== ' ' && state.cells.some((c) => c.guess.toUpperCase() === k)) return null;
  let changed = false;
  const cells = state.cells.map((c) => {
    if (!c.selected || c.fixed) return c;
    changed = true;
    return { ...c, guess: isUpper(c.code) ? k : k.toLowerCase() };
  });
  return changed ? { ...state, cells } : null;
}

/**
 * Game › Hint (`FUN_00401810`): from a random place of the phrase, the first letter not yet
 * guessed right (another random place if there is none after it). Wrong guesses of that letter
 * are cleared, and its boxes get it, fixed. The caller counts the hint.
 */
export function hint(state: State, random: () => number = Math.random): State {
  if (isSolved(state)) return state;
  const { plain } = state;
  let letter = '';
  while (!letter) {
    for (let i = rand(random) % plain.length; i < plain.length && !letter; i++) {
      const c = plain[i]!.toUpperCase();
      if (c >= 'A' && c <= 'Z' && state.cells[i]!.guess.toUpperCase() !== c) letter = c;
    }
  }
  const cells = state.cells.map((c, i) => {
    let next = c;
    if (c.guess.toUpperCase() === letter && !c.fixed) next = { ...next, guess: ' ' };
    if (plain[i]!.toUpperCase() === letter) next = { ...next, guess: next.fixed ? next.guess : plain[i]!, fixed: true };
    return next;
  });
  return { ...state, cells };
}

/** Game › Give up: hints until solved. */
export function giveUp(state: State, random: () => number = Math.random): State {
  let s = state;
  while (!isSolved(s)) s = hint(s, random);
  return end(s);
}

/** The end of a game: no box selected, no more input. */
export const end = (state: State): State => ({
  ...state,
  active: false,
  cells: state.cells.map((c) => ({ ...c, selected: false })),
});

/** The second line of the victory dialog: "with no hints!", "with 1 hint.", "with 2 hints.". */
export const hintText = (hints: number): string =>
  hints === 0 ? 'with no hints!' : `with ${hints} hint${hints > 1 ? 's' : ''}.`;
