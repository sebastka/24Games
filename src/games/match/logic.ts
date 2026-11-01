// Rules of CardMatch, as the original match.exe implements them (see docs/games/match.md for
// the functions this follows). Pure and immutable: every action returns a new state.

/** Skill levels, as stored in the registry (SkillLevel): 1 Easy, 2 Moderate, 3 Difficult. */
export type Skill = 1 | 2 | 3;

export const SKILLS: Record<Skill, string> = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' };

/** Cards per side: a 4×4 grid on Easy, 6×6 otherwise. */
export const gridSize = (skill: Skill): number => (skill === 1 ? 4 : 6);

/** A card's state: face down, face up, or matched (shown as the "found" card). */
export const Card = { Down: 0, Up: 1, Found: 2 } as const;
export type CardState = (typeof Card)[keyof typeof Card];

export interface State {
  size: number;
  /** Face of each card (index in the 6×3 sheet of faces), row by row. */
  faces: readonly number[];
  cards: readonly CardState[];
  /** The first card turned of the current pair, or -1. */
  first: number;
  /** The second card of a pair that did not match (still face up until the next click), or -1. */
  second: number;
  /** Pairs found. */
  pairs: number;
}

/**
 * A new game (`FUN_004016c0`): for each place in turn, a random number below the card count
 * that is not used yet; numbers of the second half stand for the same faces as the first half.
 */
export function deal(skill: Skill, random: () => number = Math.random): State {
  const size = gridSize(skill);
  const count = size * size;
  const used = new Array<boolean>(count).fill(false);
  const faces: number[] = [];
  for (let i = 0; i < count; i++) {
    let r: number;
    do r = Math.floor(random() * count);
    while (used[r]);
    used[r] = true;
    faces.push(r >= count / 2 ? r - count / 2 : r);
  }
  return { size, faces, cards: faces.map(() => Card.Down), first: -1, second: -1, pairs: 0 };
}

export const isWon = (state: State): boolean => state.pairs === state.faces.length / 2;

/** What a click did: its sound, or a beep. */
export type ClickEvent = 'flip' | 'match' | 'victory' | 'beep';

/**
 * A click on card `i` (`FUN_00401b50`). A matched card, or the first card of the pair clicked
 * again, beeps. Otherwise the two cards of a failed pair, if any, are turned back, then the card
 * is turned: the first of a pair, a match, or the second of a failed pair.
 */
export function click(state: State, i: number): { state: State; event: ClickEvent } {
  if (state.cards[i] === Card.Found) return { state, event: 'beep' };
  const cards = [...state.cards];
  let { first, second } = state;
  if (second !== -1) {
    cards[first] = Card.Down;
    cards[second] = Card.Down;
    first = -1;
    second = -1;
  }
  cards[i] = Card.Up;
  if (first === -1) return { state: { ...state, cards, first: i, second }, event: 'flip' };
  // The first card again: it stays face up, still waiting for its pair.
  if (first === i) return { state: { ...state, cards, first, second }, event: 'beep' };
  if (state.faces[first] === state.faces[i]) {
    cards[first] = Card.Found;
    cards[i] = Card.Found;
    const next = { ...state, cards, first: -1, second: -1, pairs: state.pairs + 1 };
    return { state: next, event: isWon(next) ? 'victory' : 'match' };
  }
  return { state: { ...state, cards, first, second: i }, event: 'flip' };
}

/** A card's rectangle in a `width`×`height` play field (`FUN_004018f0`): its cell less 3 pixels all round. */
export function cardRect(state: Pick<State, 'size'>, i: number, width: number, height: number) {
  const w = Math.trunc(width / state.size);
  const h = Math.trunc(height / state.size);
  return { x: w * (i % state.size) + 3, y: h * Math.floor(i / state.size) + 3, w: w - 6, h: h - 6 };
}

/** The card at (`x`, `y`), or -1. */
export function cardAt(state: Pick<State, 'size'>, x: number, y: number, width: number, height: number): number {
  for (let i = 0; i < state.size * state.size; i++) {
    const r = cardRect(state, i, width, height);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

/**
 * The game's clock (`FUN_00407d00`-`FUN_00407d40`): stopped at 0 when a game starts, running from
 * the first click on a card, paused while the window is inactive (a dialog or menu is open) and
 * after the last pair.
 */
export interface Clock {
  /** Start time, moved forward by the pauses. */
  start: number;
  /** When it was paused. */
  pausedAt: number;
  paused: boolean;
}

export const newClock = (now: number): Clock => ({ start: now, pausedAt: now, paused: true });

export const resume = (c: Clock, now: number): Clock =>
  c.paused ? { start: c.start + (now - c.pausedAt), pausedAt: c.pausedAt, paused: false } : c;

export const pause = (c: Clock, now: number): Clock => (c.paused ? c : { ...c, pausedAt: now, paused: true });

/** Whole seconds on the clock. */
export const seconds = (c: Clock, now: number): number => Math.floor(((c.paused ? c.pausedAt : now) - c.start) / 1000);

/** A time as the original shows it (`FUN_004052a0`): minutes, colon, two-digit seconds. */
export const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
