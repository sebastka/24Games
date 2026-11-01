import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleared,
  insert,
  loadScores,
  placeOf,
  record,
  scoreValue,
  tableOf,
  type Table,
} from '../src/shell/highscores.ts';

const table = (...scores: (number | string)[]): Table => scores.map((s, i) => ({ name: `P${i}`, score: String(s) }));

test('a score enters before the first one it beats strictly; a tie goes below', () => {
  const t = table(50, 30, 20);
  assert.equal(placeOf(t, 40), 1);
  assert.equal(placeOf(t, 30), 2, 'an equal score goes below');
  assert.equal(placeOf(t, 60), 0);
  assert.equal(placeOf(t, 10), 3, 'a free place takes a lower score');
  assert.equal(placeOf([], 0), 0, 'a free place takes any score, 0 included');
  assert.equal(placeOf(t, 25, true), 0, 'lower is better');
});

test('ten places: a full table takes only a better score, the last one drops out', () => {
  const full = table(...Array.from({ length: 10 }, (_, i) => 100 - i));
  assert.equal(placeOf(full, 91), -1);
  assert.equal(placeOf(full, 95), 6);
  const after = insert(full, 0, 'top', 200);
  assert.equal(after.length, 10);
  assert.deepEqual(after[0], { name: 'top', score: '200' });
  assert.equal(after[9]!.score, '92');
});

test("scores are their digits read as one number: CardMatch's times order correctly", () => {
  assert.equal(scoreValue('1:13'), 113);
  assert.equal(scoreValue(''), -1);
  assert.equal(scoreValue(42), 42);
  assert.equal(placeOf(table('0:40', '1:13'), '0:45', true), 1);
  assert.equal(placeOf(table('0:40'), 'none'), -1, 'a score without digits does not enter');
});

test('recording a score keeps the name for next time; Clear Scores keeps it too', () => {
  let s = { tables: {}, player: '' };
  s = record(s, 19, 0, 'Ann', 120);
  s = record(s, 19, placeOf(tableOf(s, 19), 80), 'Bob', 80);
  assert.deepEqual(tableOf(s, '19'), [
    { name: 'Ann', score: '120' },
    { name: 'Bob', score: '80' },
  ]);
  assert.equal(s.player, 'Bob');
  s = cleared(s, 19);
  assert.deepEqual(tableOf(s, 19), []);
  assert.equal(s.player, 'Bob');
  assert.deepEqual(tableOf(s, 15), []);
});

test('scores saved by the earlier web versions are read', () => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage;
  // StackBlitz and Sechseck: a table per index, free places with a null score.
  store.set(
    '24games.stackblz.hall-of-fame',
    JSON.stringify({
      tables: {
        0: [
          { name: 'Ann', score: 10 },
          { name: '', score: null },
        ],
      },
      player: 'Ann',
    }),
  );
  assert.deepEqual(loadScores('stackblz'), { tables: { 0: [{ name: 'Ann', score: '10' }] }, player: 'Ann' });
  // CardMatch, Quinto…: arrays of tables, strings as scores, playerName.
  store.set(
    '24games.match.scores',
    JSON.stringify({ tables: [[{ name: 'Bo', score: '1:13' }], []], playerName: 'Bo' }),
  );
  assert.deepEqual(loadScores('match'), { tables: { 0: [{ name: 'Bo', score: '1:13' }], 1: [] }, player: 'Bo' });
  // Cheesy Pursuit, Think Tank: ten places, null where free.
  store.set(
    '24games.cheesy.scores',
    JSON.stringify({ tables: { '7x5': [{ name: 'Cy', score: 5 }, null] }, player: 'Cy' }),
  );
  assert.deepEqual(loadScores('cheesy'), { tables: { '7x5': [{ name: 'Cy', score: '5' }] }, player: 'Cy' });
  // The card games and Voracity: in the settings.
  store.set('24games.pokergrd', JSON.stringify({ scores: [[{ name: 'Di', score: 33 }]], playerName: 'Di', face: 1 }));
  assert.deepEqual(loadScores('pokergrd', 'pokergrd'), { tables: { 0: [{ name: 'Di', score: '33' }] }, player: 'Di' });
  // The current format wins once saved.
  store.set('24games.pokergrd.scores', JSON.stringify({ tables: { 0: [] }, player: 'Ed' }));
  assert.deepEqual(loadScores('pokergrd', 'pokergrd'), { tables: { 0: [] }, player: 'Ed' });
  assert.deepEqual(loadScores('none'), { tables: {}, player: '' });
});
