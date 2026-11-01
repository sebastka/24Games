import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/shell/cards/cards.ts';
import {
  buttonLabel,
  deal,
  GameType,
  isBroke,
  paylineOf,
  PAYTABLES,
  payout,
  redeal,
  setBet,
  signIn,
  toggle,
  type State,
} from '../src/games/pokermat/logic.ts';

const c = (rank: number, suit: number): Card => ({ rank, suit });
const [straight, jokers, deuces] = PAYTABLES as [(typeof PAYTABLES)[0], (typeof PAYTABLES)[0], (typeof PAYTABLES)[0]];

test('the pay tables of the three games', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((bet) => payout(straight, 0, bet)),
    [250, 500, 750, 1000, 4000],
  );
  assert.equal(payout(straight, 8, 3), 3);
  assert.equal(payout(jokers, 0, 5), 4700);
  assert.equal(payout(jokers, 0, 4), 1600);
  assert.equal(payout(deuces, 1, 2), 400);
  assert.equal(straight.hands.length, 9);
  assert.equal(jokers.hands.length, 11);
  assert.equal(deuces.hands.length, 10);
});

test('the payline of a hand is the highest one it makes', () => {
  // A pair of kings is "Jacks or better" in straight poker, "Kings or better" with jokers.
  const kings = [c(13, 0), c(13, 1), c(2, 2), c(5, 3), c(9, 0)];
  assert.equal(paylineOf(straight, kings), 8);
  assert.equal(paylineOf(jokers, kings), 10);
  assert.equal(paylineOf(deuces, kings), 9, 'the deuce makes three kings');
  assert.equal(paylineOf(straight, [c(3, 0), c(3, 1), c(2, 2), c(5, 3), c(9, 0)]), null);
  const fullHouse = [c(9, 0), c(9, 1), c(9, 2), c(5, 3), c(5, 0)];
  assert.equal(straight.hands[paylineOf(straight, fullHouse)!], straight.hands[3]);
  const fourDeuces = [c(2, 0), c(2, 1), c(2, 2), c(2, 3), c(9, 0)];
  assert.equal(paylineOf(deuces, fourDeuces), 1);
});

test('a round: the bet paid, cards held or discarded, the redeal paying the bet column', () => {
  const s0 = signIn(GameType.Straight, 2);
  assert.equal(buttonLabel(s0), 'Deal');
  const s1 = deal(s0, Math.random)!;
  assert.equal(s1.balance, 98);
  assert.equal(s1.hand.length, 5);
  assert.equal(buttonLabel(s1), 'Redeal');
  assert.equal(setBet(s1, 1), null, 'no bet change while drawing');
  const s2 = toggle(toggle(s1, 0)!, 3)!;
  assert.deepEqual(s2.held, [false, true, true, false, true]);
  const s3 = redeal(s2);
  assert.equal(s3.phase, 'over');
  assert.deepEqual(s3.hand[1], s1.hand[1]);
  assert.deepEqual(s3.hand[0], s1.deck[5]);
  assert.deepEqual(s3.hand[3], s1.deck[6]);
  assert.equal(s3.balance, 98 + s3.win);
  assert.equal(toggle(s3, 0), null);
});

test('winning hands pay, a short balance lowers the bet, an empty one ends the game', () => {
  const royal = [c(10, 1), c(11, 1), c(12, 1), c(13, 1), c(1, 1)];
  const base: State = {
    ...signIn(GameType.Straight, 5),
    phase: 'draw',
    fresh: false,
    deck: royal,
    next: 5,
    hand: royal,
    balance: 0,
  };
  const won = redeal(base);
  assert.equal(won.win, 4000);
  assert.equal(won.balance, 4000);
  const nothing = [c(3, 0), c(5, 1), c(9, 2), c(11, 3), c(13, 0)];
  const short = redeal({ ...base, hand: nothing, balance: 3 });
  assert.equal(short.bet, 3);
  const broke = redeal({ ...base, hand: nothing, balance: 0 });
  assert.ok(isBroke(broke));
  assert.equal(deal(broke, Math.random), null, 'no deal without money');
  assert.equal(setBet(broke, 1), null);
});

test('jokers wild deals from 54 cards', () => {
  const s = deal(signIn(GameType.JokersWild), Math.random)!;
  assert.equal(s.deck.length, 54);
  assert.equal(deal(signIn(GameType.DeucesWild), Math.random)!.deck.length, 52);
});
