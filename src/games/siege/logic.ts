// Rules of Siege, as the original siege.exe implements them (see docs/games/siege.md for the
// functions this follows). Pure and immutable.
import { newDeck, Rank, shuffle, type Card, type Random } from '../../shell/cards/cards.ts';

/** Piles 0-3: the foundations (one per row); 4-7 the left wing, 8-11 the right wing. */
export const FOUNDATIONS = [0, 1, 2, 3];
export const WINGS = [4, 5, 6, 7, 8, 9, 10, 11];
export const isFoundation = (pile: number): boolean => pile < 4;
/** The row of a pile, 0 at the top. */
export const rowOf = (pile: number): number => pile % 4;

export interface Move {
  from: number;
  to: number;
}

export interface State {
  /** The 12 piles, bottom card first. */
  piles: readonly (readonly Card[])[];
  /** False once won or claimed: the cards no longer move. */
  playing: boolean;
  /** The last move, which Game › Undo Last Move takes back. */
  last: Move | null;
  /** Game › Claim was used: it is disabled until the next deal. */
  claimed: boolean;
}

/**
 * FUN_0040a5e3: the shuffled deck dealt into the wings, pile after pile (4, 5, … 11), six cards
 * each; with `acesPlaced` the aces go to the foundations (of their suit's row) instead, otherwise
 * the four corner piles (4, 7, 8, 11) take seven.
 */
export function deal(acesPlaced: boolean, random: Random): State {
  const piles: Card[][] = Array.from({ length: 12 }, () => []);
  let pile = 4;
  for (const card of shuffle(newDeck(), random)) {
    if (acesPlaced && card.rank === Rank.Ace) {
      piles[card.suit]!.push(card);
      continue;
    }
    piles[pile]!.push(card);
    const size = !acesPlaced && [4, 7, 8, 11].includes(pile) ? 7 : 6;
    if (piles[pile]!.length === size) pile = Math.min(11, pile + 1);
  }
  return { piles, playing: true, last: null, claimed: false };
}

export const top = (state: State, pile: number): Card | undefined => state.piles[pile]!.at(-1);

/**
 * Where the top card of `from` may go (FUN_00409b3e builds these drop zones): onto another wing
 * pile that is empty or whose top card is one rank higher, whatever the suit; onto a foundation
 * that is empty if it is an ace, or whose top card is of its suit and one rank apart.
 */
export function canMove(state: State, from: number, to: number): boolean {
  const card = top(state, from);
  if (!state.playing || !card || from === to || isFoundation(from)) return false;
  const onto = top(state, to);
  if (!isFoundation(to)) return !onto || onto.rank - card.rank === 1;
  if (!onto) return card.rank === Rank.Ace;
  return onto.suit === card.suit && Math.abs(card.rank - onto.rank) === 1;
}

/** FUN_00409f70: the top card of `from` onto `to`. */
export function move(state: State, from: number, to: number): State {
  const card = top(state, from)!;
  const piles = state.piles.map((p, i) => (i === from ? p.slice(0, -1) : i === to ? [...p, card] : p));
  const next = { ...state, piles, last: { from, to } };
  return isWon(next) ? { ...next, playing: false, last: null } : next;
}

/**
 * The foundation a double-click sends the top card of `from` to (FUN_0040a2ad): the one built in
 * its suit, else the first empty one; null if the card does not go there.
 */
export function foundationFor(state: State, from: number): number | null {
  const card = top(state, from);
  if (!state.playing || !card || isFoundation(from)) return null;
  const ofSuit = FOUNDATIONS.find((f) => state.piles[f]![0]?.suit === card.suit);
  const target = ofSuit ?? FOUNDATIONS.find((f) => state.piles[f]!.length === 0)!;
  const onto = top(state, target);
  const fits = onto ? Math.abs(card.rank - onto.rank) === 1 : card.rank === Rank.Ace;
  return fits ? target : null;
}

/** All the cards are on the foundations. */
export const isWon = (state: State): boolean => WINGS.every((p) => state.piles[p]!.length === 0);

/**
 * Game › Claim is enabled when every wing pile is in descending order from its bottom card up
 * (end of FUN_0040a875): the rest would play out. It stays enabled after a win (the empty wings
 * qualify), as in the original.
 */
export const canClaim = (state: State): boolean =>
  !state.claimed && WINGS.every((p) => state.piles[p]!.every((c, i, pile) => i === 0 || pile[i - 1]!.rank >= c.rank));

/**
 * Whether Undo Last Move is enabled. The original records the move's piles and enables the
 * item unless one of them is 0, which it takes for "no move": a card played to the first
 * foundation (clubs, with the aces placed) cannot be undone.
 */
export const canUndo = (state: State): boolean => state.playing && !!state.last && state.last.to !== 0;

/** Game › Undo Last Move: the card back where it came from. */
export function undo(state: State): State {
  if (!canUndo(state)) return state;
  const { from, to } = state.last!;
  const card = top(state, to)!;
  const piles = state.piles.map((p, i) => (i === to ? p.slice(0, -1) : i === from ? [...p, card] : p));
  return { ...state, piles, last: null };
}

/** Game › Claim: the game is over. */
export const claim = (state: State): State => ({ ...state, playing: false, last: null, claimed: true });
