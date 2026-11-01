import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slide } from '../src/shell/czgame/animate.ts';
import { bevel, FACE, invertOutline, LIGHT, SHADOW } from '../src/shell/czgame/draw.ts';

/** A context that paints solid rectangles into a map of pixels (and counts how often each is painted). */
function pixels() {
  const at = new Map<string, string>();
  const hits = new Map<string, number>();
  const ctx = {
    fillStyle: '',
    globalCompositeOperation: '',
    save() {},
    restore() {},
    fillRect(x: number, y: number, w: number, h: number) {
      for (let i = x; i < x + w; i++) {
        for (let j = y; j < y + h; j++) {
          at.set(`${i},${j}`, ctx.fillStyle);
          hits.set(`${i},${j}`, (hits.get(`${i},${j}`) ?? 0) + 1);
        }
      }
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, at, hits };
}

test('a bevel: edges drawn top, right, bottom, left (the left one owns the bottom left corner)', () => {
  const { ctx, at } = pixels();
  bevel(ctx, { left: 0, top: 0, right: 9, bottom: 9 }, 2);
  assert.equal(at.get('0,0'), LIGHT);
  assert.equal(at.get('9,0'), SHADOW, 'top right: the right edge');
  assert.equal(at.get('9,9'), SHADOW);
  assert.equal(at.get('0,9'), LIGHT, 'bottom left: the left edge');
  assert.equal(at.get('1,8'), LIGHT);
  assert.equal(at.get('5,5'), FACE);
  const sunken = pixels();
  bevel(sunken.ctx, { left: 0, top: 0, right: 9, bottom: 9 }, 1, null, 'sunken');
  assert.equal(sunken.at.get('0,0'), SHADOW);
  assert.equal(sunken.at.get('5,5'), undefined, 'not filled');
});

test('the zones mark inverts each pixel of its band once', () => {
  const { ctx, hits } = pixels();
  invertOutline(ctx, 0, 0, 10, 8, 3);
  assert.equal(hits.size, 10 * 8 - 4 * 2);
  assert.ok([...hits.values()].every((n) => n === 1));
});

test('a piece slides `speed` pixels per 4 ms step, then lands', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 30, y: 40 };
  assert.deepEqual(slide(from, to, 10, 3), { at: { x: 0, y: 0 }, done: false });
  assert.deepEqual(slide(from, to, 10, 8), { at: { x: 12, y: 16 }, done: false });
  assert.deepEqual(slide(from, to, 10, 20), { at: to, done: true });
  assert.deepEqual(slide(from, to, 0, 0), { at: to, done: true }, 'animation disabled');
});
