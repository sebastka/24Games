import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msvcRand, rand } from '../src/shell/random.ts';

test('msvcRand is the C runtime generator', () => {
  const r = msvcRand(1);
  assert.deepEqual([r(), r(), r()], [41, 18467, 6334]);
});

test('rand draws 0…32767 from a random function', () => {
  assert.equal(
    rand(() => 0),
    0,
  );
  assert.equal(
    rand(() => 0.999999),
    32767,
  );
});
