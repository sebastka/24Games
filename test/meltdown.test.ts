import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clickable,
  COMPUTER,
  computerMove,
  computerPlace,
  critical,
  emptyBoard,
  ownerOf,
  PLAYER,
  playerPlace,
  totals,
  type Board,
} from '../src/games/meltdown/logic.ts';
import { msvcRand } from '../src/shell/random.ts';

/** A board from rows of numbers (the original's values: 1-10 the player, 11-20 the computer). */
const board = (rows: number[][]): Board => rows.flat();

test('critical mass: 2 in a corner, 3 on an edge, 4 inside', () => {
  assert.equal(critical(5, 0), 2);
  assert.equal(critical(5, 24), 2);
  assert.equal(critical(5, 2), 3);
  assert.equal(critical(5, 10), 3);
  assert.equal(critical(5, 12), 4);
  assert.equal(critical(7, 6), 2);
});

test('a square below its critical mass grows; the first move never explodes', () => {
  const { board: b } = playerPlace(emptyBoard(5), 0);
  assert.equal(b[0], 1);
  assert.equal(ownerOf(b[0]!), PLAYER);
  const { board: c } = computerPlace(b, 24);
  assert.equal(c[24], 11);
  assert.equal(ownerOf(c[24]!), COMPUTER);
});

test('a corner explodes at 2: its units go up, right, down, left, taking the opponent squares', () => {
  const b = board([
    [1, 12, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 11],
  ]);
  const { board: after, events } = playerPlace(b, 0);
  // The computer's 2 units on (1,0) become the player's 3: an edge square at its mass explodes
  // in turn (right, down, then back into the corner), before the corner's unit goes down.
  assert.equal(events[0], 'Player Captures');
  assert.deepEqual([after[0], after[1], after[2], after[5], after[6]], [1, 0, 1, 1, 1]);
  assert.equal(totals(after).computer, 1);
});

test('the reaction stops as soon as one side is wiped out', () => {
  const b = board([
    [1, 11, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
  const { board: after } = playerPlace(b, 0);
  // The corner explodes into (1,0), taking the computer's last unit: then nothing more explodes.
  assert.equal(totals(after).computer, 0);
  assert.equal(after[1], 2);
});

test('the player may click empty squares and its own', () => {
  const b = board([
    [1, 11],
    [0, 2],
  ]);
  assert.deepEqual(clickable(b), [true, false, true, true]);
});

test('the computer plays a legal square, with a single rand() per move', () => {
  let draws = 0;
  const rand = msvcRand(5);
  const counted = () => {
    draws++;
    return rand();
  };
  const first = computerMove(emptyBoard(6), 1, counted);
  assert.ok(first >= 0 && first < 36);
  assert.equal(draws, 1);
  const b = playerPlace(computerPlace(emptyBoard(6), first).board, first === 0 ? 35 : 0).board;
  const reply = computerMove(b, 3, counted);
  assert.ok(b[reply] === 0 || b[reply]! > 10);
  assert.equal(draws, 2);
});

test('the computer takes a winning reaction', () => {
  // The computer's corner one unit below its critical mass, next to the player's only square.
  const b = board([
    [11, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
  for (let skill = 1; skill <= 4; skill++) {
    const square = computerMove(b, skill, msvcRand(skill));
    assert.equal(totals(computerPlace(b, square).board).player, 0, `skill ${skill}`);
  }
});

test('whole games end with a side wiped out, deterministically', () => {
  const games = [0, 1].map(() => {
    const rand = msvcRand(9);
    let b = emptyBoard(5);
    const played: number[] = [];
    for (let turn = 0; turn < 200; turn++) {
      const t = totals(b);
      if (turn > 1 && (t.player === 0 || t.computer === 0)) break;
      if (turn % 2 === 0) {
        const options = clickable(b).flatMap((ok, i) => (ok ? [i] : []));
        const square = options[rand() % options.length]!;
        played.push(square);
        b = playerPlace(b, square).board;
      } else {
        const square = computerMove(b, 2, rand);
        played.push(square);
        b = computerPlace(b, square).board;
      }
    }
    const t = totals(b);
    assert.ok(t.player === 0 || t.computer === 0);
    return played;
  });
  assert.deepEqual(games[0], games[1]);
});
