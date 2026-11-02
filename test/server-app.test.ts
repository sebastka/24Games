// The HTTP API, against an in-memory store with the same rules as the MariaDB one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, rateLimiter } from '../src/server/app.ts';
import type { ScoreStore } from '../src/server/db.ts';
import { cleanName, cleanScore, insert, placeOf, SCORE_GAMES, type Entry } from '../src/shared/highscores.ts';

class MemoryStore implements ScoreStore {
  readonly data = new Map<string, Entry[]>();

  async tables(game: string) {
    const out: Record<string, Entry[]> = {};
    for (const [key, table] of this.data) if (key.startsWith(`${game}/`)) out[key.slice(game.length + 1)] = table;
    return out;
  }

  async submit(game: string, table: string, name: string, score: string) {
    const key = `${game}/${table}`;
    const current = this.data.get(key) ?? [];
    const place = placeOf(current, score, SCORE_GAMES[game]?.lowerIsBetter);
    const after = place >= 0 ? [...insert(current, place, name, score)] : current;
    this.data.set(key, after);
    return { place, table: after };
  }
}

const post = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...headers },
  body: JSON.stringify(body),
});

test('scores are ranked by the server, best first, lower first for times', async () => {
  const store = new MemoryStore();
  const app = createApp({ store, staticDir: '/nonexistent' });
  for (const [name, score] of [
    ['Ann', 120],
    ['Bob', 300],
    ['Cy', 120],
  ] as const) {
    assert.equal((await app.request('/api/scores/stackblz/0', post({ name, score }))).status, 200);
  }
  const res = await app.request('/api/scores/stackblz');
  assert.deepEqual(await res.json(), {
    shared: true,
    tables: {
      '0': [
        { name: 'Bob', score: '300' },
        { name: 'Ann', score: '120' },
        { name: 'Cy', score: '120' },
      ],
    },
  });
  await app.request('/api/scores/match/0', post({ name: 'Slow', score: '2:10' }));
  const fast = await app.request('/api/scores/match/0', post({ name: 'Fast', score: '1:05' }));
  assert.deepEqual(await fast.json(), {
    place: 0,
    table: [
      { name: 'Fast', score: '1:05' },
      { name: 'Slow', score: '2:10' },
    ],
  });
});

test('a full table refuses a score that does not beat its last entry', async () => {
  const store = new MemoryStore();
  const app = createApp({ store, scoresPerMinute: 100, staticDir: '/nonexistent' });
  for (let i = 10; i > 0; i--) await app.request('/api/scores/cheesy/1', post({ name: `P${i}`, score: i * 10 }));
  const low = await (await app.request('/api/scores/cheesy/1', post({ name: 'Low', score: 10 }))).json();
  assert.equal(low.place, -1);
  const high = await (await app.request('/api/scores/cheesy/1', post({ name: 'High', score: 55 }))).json();
  assert.equal(high.place, 5);
  assert.equal(high.table.length, 10);
  assert.equal(high.table.at(-1).name, 'P2');
});

test('unknown games, bad tables, names and scores are refused', async () => {
  const app = createApp({ store: new MemoryStore(), staticDir: '/nonexistent' });
  assert.equal((await app.request('/api/scores/winmine')).status, 404);
  assert.equal((await app.request('/api/scores/__proto__')).status, 404);
  assert.equal((await app.request('/api/scores/cheesy/a%20b', post({ name: 'A', score: 1 }))).status, 404);
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: '  ', score: 1 }))).status, 400);
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: 'A', score: -5 }))).status, 400);
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: 'A', score: '1e9' }))).status, 400);
  const big = { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(5000) };
  assert.equal((await app.request('/api/scores/cheesy/1', big)).status, 413);
});

test('names and scores are cleaned as the games show them', () => {
  assert.equal(cleanName('  Ann\u0007 '), 'Ann');
  assert.equal(cleanName('x'.repeat(40))?.length, 30);
  assert.equal(cleanName(42), null);
  assert.equal(cleanScore(1250), '1250');
  assert.equal(cleanScore('1:13'), '1:13');
  assert.equal(cleanScore('1:75'), null);
  assert.equal(cleanScore(1.5), null);
});

test('cross-site submissions are refused', async () => {
  const app = createApp({ store: new MemoryStore(), staticDir: '/nonexistent' });
  const body = { name: 'A', score: 1 };
  assert.equal((await app.request('/api/scores/cheesy/1', post(body, { 'sec-fetch-site': 'cross-site' }))).status, 403);
  const foreign = post(body, { origin: 'https://evil.example', host: 'games.example' });
  delete (foreign.headers as Record<string, string>)['sec-fetch-site'];
  assert.equal((await app.request('http://games.example/api/scores/cheesy/1', foreign)).status, 403);
});

test('submissions to a table are limited per minute', async () => {
  let now = 0;
  const allow = rateLimiter(2, () => now);
  assert.ok(allow('cheesy/1') && allow('cheesy/1'));
  assert.ok(!allow('cheesy/1'));
  assert.ok(allow('cheesy/2'));
  now = 60_000;
  assert.ok(allow('cheesy/1'));

  const app = createApp({ store: new MemoryStore(), scoresPerMinute: 1, staticDir: '/nonexistent' });
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: 'A', score: 1 }))).status, 200);
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: 'B', score: 2 }))).status, 429);
});

test('without a database, the tables are not shared (the games keep their scores)', async () => {
  const app = createApp({ store: null, staticDir: '/nonexistent' });
  assert.deepEqual(await (await app.request('/api/scores/cheesy')).json(), { shared: false });
  assert.equal((await app.request('/api/scores/cheesy/1', post({ name: 'A', score: 1 }))).status, 404);
  assert.deepEqual(await (await app.request('/api/health')).json(), { ok: true });
});

test('the site: security headers, hashed assets cached, the page revalidated', async () => {
  const dir = mkdtempSync(join(tmpdir(), '24games-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<div id="root"></div>');
  writeFileSync(join(dir, 'assets', 'index-abc.js'), 'export {};');
  const app = createApp({ store: null, staticDir: dir });
  const page = await app.request('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  const route = await app.request('/some/route');
  assert.match(await route.text(), /id="root"/);
  const asset = await app.request('/assets/index-abc.js');
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});
