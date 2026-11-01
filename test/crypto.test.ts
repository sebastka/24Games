import { test } from 'node:test';
import assert from 'node:assert/strict';
import file1 from '../src/assets/crypto/phrases1.json' with { type: 'json' };
import file2 from '../src/assets/crypto/phrases2.json' with { type: 'json' };
import {
  arrange,
  cellAt,
  encode,
  giveUp,
  hint,
  hintText,
  isSolved,
  pickPhrase,
  select,
  shuffleKey,
  start,
  type,
  type PhraseFile,
} from '../src/games/crypto/logic.ts';

/** A random function returning `values` (as rand() results, 0-32767) in turn. */
const rands = (...values: number[]) => {
  let i = 0;
  return () => (values[i++ % values.length]! + 0.5) / 32768;
};

const IDENTITY = Array.from({ length: 26 }, (_, i) => i);

test('the phrase files', () => {
  assert.equal(file1.phrases.length, 595);
  assert.equal(file2.phrases.length, 1289);
  assert.equal(file1.phrases[0]![1], "A baby is God's opinion that the world should go on. -- Carl Sandburg");
  assert.equal(file2.size, 79493);
});

test('picking a phrase: every phrase equally likely (the original favoured the first one)', () => {
  const file = file1 as PhraseFile;
  assert.equal(
    pickPhrase(file, () => 0),
    file.phrases[0]![1],
  );
  assert.equal(
    pickPhrase(file, () => 0.999999),
    file.phrases.at(-1)![1],
  );
  const picks = new Set(Array.from({ length: 2000 }, (_, i) => pickPhrase(file, () => (i * 0.618034) % 1)));
  assert.ok(picks.size > 500, `${picks.size} different phrases in 2000 games`);
});

test('Difficult and Expert run the letters together, 26 to a line', () => {
  assert.equal(arrange('A b c.', 1), 'A b c.');
  const long = 'abcdefghij klmnopqrst uvwxyz ABCDEF';
  assert.equal(arrange(long, 3), 'abcdefghijklmnopqrstuvwxyz ABCDEF');
});

test('the key is a permutation; encoding keeps case and punctuation', () => {
  const key = shuffleKey(rands(1, 2, 3, 30000, 7));
  assert.deepEqual(
    [...key].sort((a, b) => a - b),
    IDENTITY,
  );
  const shift = IDENTITY.map((i) => (i + 1) % 26);
  assert.equal(encode("Az, b'z!", shift), "Ba, c'a!");
});

test('layout: 24 pixels per box; a word that does not fit goes to the next line', () => {
  const s = start('ab cd', IDENTITY);
  assert.deepEqual(
    s.cells.map((c) => [c.x, c.y, c.code]),
    [
      [8, 2, 'a'],
      [32, 2, 'b'],
      [56, 2, ''],
      [80, 2, 'c'],
      [104, 2, 'd'],
    ],
  );
  const wrapped = start(`${'a'.repeat(24)} bc`, IDENTITY);
  assert.deepEqual([wrapped.cells[25]!.x, wrapped.cells[25]!.y], [8, 52]);
  assert.equal(cellAt(s, 10, 30), 0);
  assert.equal(cellAt(s, 60, 30), -1);
  assert.equal(cellAt(s, 60, 30, 12), 1, 'the nearest box, for a finger');
});

test('selecting a box selects its letter everywhere; a letter fills them in their case', () => {
  const shift = IDENTITY.map((i) => (i + 1) % 26);
  let s = start('Aa b.', shift); // coded "Bb c."
  assert.ok(s.cells[4]!.fixed && s.cells[4]!.guess === '.');
  const r = select(s, 0);
  assert.equal(r.event, 'select');
  assert.deepEqual(
    r.state.cells.map((c) => c.selected),
    [true, true, false, false, false],
  );
  s = type(r.state, 'a')!;
  assert.deepEqual(
    s.cells.map((c) => c.guess),
    ['A', 'a', '', '', '.'],
  );
  assert.equal(type(s, 'A'), null, 'a letter already used elsewhere is refused');
  assert.ok(!isSolved(s));
  s = type(select(s, 3).state, 'b')!;
  assert.ok(isSolved(s));
});

test('a hint fixes a letter not guessed yet and clears its wrong guesses', () => {
  let s = start('ab', IDENTITY);
  s = type(select(s, 0).state, 'b')!; // wrong: "b" in the "a" box
  s = hint(s, rands(1));
  assert.deepEqual(
    s.cells.map((c) => [c.guess, c.fixed]),
    [
      [' ', false],
      ['b', true],
    ],
  );
  s = giveUp(s, rands(0));
  assert.ok(isSolved(s));
  assert.ok(!s.active);
  assert.equal(select(s, 0).event, 'beep');
  assert.equal(hintText(0), 'with no hints!');
  assert.equal(hintText(1), 'with 1 hint.');
  assert.equal(hintText(3), 'with 3 hints.');
});
