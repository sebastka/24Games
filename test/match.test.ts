import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insert, placeOf, scoreValue } from '../src/games/match/hallOfFame.ts';
import {
  Card,
  cardAt,
  cardRect,
  click,
  deal,
  formatTime,
  newClock,
  pause,
  resume,
  seconds,
  type State,
} from '../src/games/match/logic.ts';

/** A deterministic random function (a linear congruential generator). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

test('a deal has every face twice: 8 faces on Easy, 18 otherwise', () => {
  for (const [skill, size, faces] of [
    [1, 4, 8],
    [2, 6, 18],
    [3, 6, 18],
  ] as const) {
    const s = deal(skill, seeded(skill));
    assert.equal(s.size, size);
    assert.equal(s.faces.length, size * size);
    for (let f = 0; f < faces; f++) assert.equal(s.faces.filter((x) => x === f).length, 2);
    assert.ok(s.cards.every((c) => c === Card.Down));
  }
  assert.deepEqual(deal(2, seeded(7)).faces, deal(2, seeded(7)).faces, 'the deal depends only on the random function');
});

/** A 2×2 game: faces 0 1 / 1 0. */
const small = (): State => ({ size: 2, faces: [0, 1, 1, 0], cards: [0, 0, 0, 0], first: -1, second: -1, pairs: 0 });

test('turning a pair that does not match leaves it up until the next click', () => {
  let { state, event } = click(small(), 0);
  assert.equal(event, 'flip');
  ({ state, event } = click(state, 1));
  assert.equal(event, 'flip');
  assert.deepEqual(state.cards, [Card.Up, Card.Up, Card.Down, Card.Down]);
  ({ state, event } = click(state, 2));
  assert.equal(event, 'flip');
  assert.deepEqual(state.cards, [Card.Down, Card.Down, Card.Up, Card.Down], 'the failed pair is turned back');
  assert.equal(state.first, 2);
});

test('a match, a beep on a matched card or on the first card again, then victory', () => {
  let { state } = click(small(), 1);
  let event;
  ({ state, event } = click(state, 1));
  assert.equal(event, 'beep', 'the first card again');
  assert.equal(state.cards[1], Card.Up);
  ({ state, event } = click(state, 2));
  assert.equal(event, 'match');
  assert.deepEqual(state.cards, [Card.Down, Card.Found, Card.Found, Card.Down]);
  ({ state, event } = click(state, 2));
  assert.equal(event, 'beep');
  ({ state } = click(state, 0));
  ({ state, event } = click(state, 3));
  assert.equal(event, 'victory');
  assert.equal(state.pairs, 2);
});

test('cards fill their cells less 3 pixels; clicks between them hit nothing', () => {
  const s = { size: 4 };
  assert.deepEqual(cardRect(s, 0, 440, 440), { x: 3, y: 3, w: 104, h: 104 });
  assert.deepEqual(cardRect(s, 5, 440, 440), { x: 113, y: 113, w: 104, h: 104 });
  assert.equal(cardAt(s, 115, 115, 440, 440), 5);
  assert.equal(cardAt(s, 109, 50, 440, 440), -1);
  assert.deepEqual(cardRect({ size: 6 }, 35, 440, 440), { x: 368, y: 368, w: 67, h: 67 });
});

test('the clock starts paused, and pauses do not count', () => {
  let c = newClock(1000);
  assert.equal(seconds(c, 60_000), 0);
  c = resume(c, 5000);
  assert.equal(seconds(c, 7500), 2);
  c = pause(c, 8000);
  c = resume(c, 20_000);
  assert.equal(seconds(c, 21_000), 4);
  assert.equal(formatTime(73), '1:13');
  assert.equal(formatTime(5), '0:05');
});

test('high scores: the digits are the value; a time enters before a strictly longer one', () => {
  assert.equal(scoreValue('1:13'), 113);
  assert.equal(scoreValue(''), -1);
  const table = [
    { name: 'A', score: '0:30' },
    { name: 'B', score: '1:00' },
  ];
  assert.equal(placeOf(table, '0:45', false), 1);
  assert.equal(placeOf(table, '1:00', false), 2, 'a tie goes after');
  assert.equal(placeOf(table, '2:00', false), 2, 'an empty place');
  const full = Array.from({ length: 10 }, (_, i) => ({ name: `${i}`, score: `0:${10 + i}` }));
  assert.equal(placeOf(full, '0:30', false), -1);
  assert.equal(placeOf(full, '0:30', true), 0);
  const after = insert(full, 0, { name: 'X', score: '0:05' });
  assert.equal(after.length, 10);
  assert.equal(after[0]!.name, 'X');
  assert.equal(after[9]!.name, '8');
});
