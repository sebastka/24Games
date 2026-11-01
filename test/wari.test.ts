import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDGETS,
  ORIGINAL_BUDGETS,
  computerMove,
  isOver,
  newBoard,
  play,
  scores,
  THRESHOLD,
  type Board,
} from '../src/games/wari/logic.ts';

// Pits 0-5 the player's, 6 the player's goal, 7-12 the computer's (right to left), 13 its goal.
const board = (player: number[], playerGoal: number, computer: number[], computerGoal: number): Board => [
  ...player,
  playerGoal,
  ...computer,
  computerGoal,
];

test('newBoard: n pieces per pit, or 1 to 6 at random, the goals empty', () => {
  assert.deepEqual(newBoard(4, Math.random), board([4, 4, 4, 4, 4, 4], 0, [4, 4, 4, 4, 4, 4], 0));
  let i = 0;
  const values = [0, 0.99, 0.5];
  const random = newBoard(0, () => values[i++ % 3]!);
  assert.deepEqual(random, board([1, 6, 4, 1, 6, 4], 0, [1, 6, 4, 1, 6, 4], 0));
});

test('sowing counterclockwise; the last piece in the own goal gives another turn', () => {
  const start = board([3, 3, 3, 3, 3, 3], 0, [3, 3, 3, 3, 3, 3], 0);
  const m = play(start, 3);
  assert.deepEqual(m.board, board([3, 3, 3, 0, 4, 4], 1, [3, 3, 3, 3, 3, 3], 0));
  assert.ok(m.extraTurn);
  assert.deepEqual(
    m.transfers.map((t) => t.to),
    [4, 5, 6],
  );
  assert.ok(!play(start, 0).extraTurn);
});

test('the last piece in an empty own pit takes the opposite pit (and stays)', () => {
  const b = board([1, 0, 0, 0, 0, 0], 0, [0, 0, 0, 0, 5, 0], 0);
  const m = play(b, 0);
  // Pit 1 is opposite pit 11.
  assert.deepEqual(m.board, board([0, 1, 0, 0, 0, 0], 5, [0, 0, 0, 0, 0, 0], 0));
  assert.equal(m.transfers.length, 6);
  assert.ok(!m.extraTurn);
});

test('the game sows into the opponent goal too (the original does)', () => {
  const b = board([0, 0, 0, 0, 0, 9], 0, [1, 1, 1, 1, 1, 1], 0);
  const m = play(b, 5);
  // 6, 7-12, 13 (the computer's goal), then 0: empty, so pit 12 (2 pieces by now) is taken.
  assert.deepEqual(m.board, board([1, 0, 0, 0, 0, 0], 3, [2, 2, 2, 2, 2, 0], 1));
});

test('"playing" the empty player goal passes the turn (a game with the computer first)', () => {
  const b = newBoard(3, Math.random);
  const m = play(b, 6);
  assert.deepEqual(m.board, b);
  assert.ok(!m.extraTurn);
});

test('the game ends when a row is empty; each side keeps its row', () => {
  const b = board([0, 0, 0, 0, 0, 0], 10, [1, 2, 0, 0, 0, 0], 20);
  assert.ok(isOver(b));
  assert.deepEqual(scores(b), { player: 10, computer: 23 });
  assert.ok(!isOver(board([1, 0, 0, 0, 0, 0], 0, [0, 0, 0, 0, 0, 1], 0)));
});

test('skill budgets as the original reads them; the ±1000 threshold never applies', () => {
  assert.deepEqual(BUDGETS, [65, 130, 195, 64000]);
  assert.ok(THRESHOLD > 72);
});

test('the computer plays its only pit', () => {
  assert.equal(computerMove(board([3, 3, 3, 3, 3, 3], 0, [0, 0, 0, 2, 0, 0], 0), 4), 10);
});

test("with the original's budgets, the computer's openings match the original's (Wine, computer first)", () => {
  // Observed: 3 per pit: Easy plays 12, Moderate 11, Difficult 10 then 12; 4 per pit, Moderate 9.
  const original = (b: Parameters<typeof computerMove>[0], skill: number) =>
    computerMove(b, skill, THRESHOLD, ORIGINAL_BUDGETS);
  const three = newBoard(3, Math.random);
  assert.equal(original(three, 1), 12);
  assert.equal(original(three, 2), 11);
  assert.equal(original(three, 3), 10);
  const after = play(three, 10);
  assert.ok(after.extraTurn);
  assert.equal(original(after.board, 3), 12);
  assert.equal(original(newBoard(4, Math.random), 2), 9);
});

test('the fixed budgets grow with the skill level', () => {
  assert.ok(BUDGETS.every((b, i) => i === 0 || b > BUDGETS[i - 1]!));
});

test('the computer takes an extra turn and a capture when it can', () => {
  // Pit 7 holds 6 pieces: they reach the computer goal (13) exactly.
  const b = board([2, 2, 2, 2, 2, 2], 0, [6, 0, 0, 0, 0, 0], 0);
  const move = computerMove(b, 2);
  assert.equal(move, 7);
});

test('the computer is deterministic', () => {
  const b = board([1, 5, 2, 6, 3, 4], 2, [4, 1, 6, 2, 5, 3], 1);
  for (const skill of [1, 2, 3, 4]) assert.equal(computerMove(b, skill), computerMove(b, skill));
});
