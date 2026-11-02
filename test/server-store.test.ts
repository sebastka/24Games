// Integration tests against a real MariaDB. Skipped unless TEST_DB_HOST is set.
// The database named TEST_DB_NAME (default games24_test) is dropped and recreated.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import mariadb from 'mariadb';
import { Store } from '../src/server/db.ts';

const env = process.env;
const cfg = {
  host: env.TEST_DB_HOST ?? '',
  port: Number(env.TEST_DB_PORT ?? 3306),
  user: env.TEST_DB_USER ?? 'root',
  password: env.TEST_DB_PASSWORD,
  database: env.TEST_DB_NAME ?? 'games24_test',
};

describe('Store (MariaDB)', { skip: cfg.host ? false : 'TEST_DB_HOST not set' }, () => {
  let store: Store;

  before(async () => {
    if (!/^\w+$/.test(cfg.database) || !cfg.database.endsWith('_test')) {
      throw new Error('TEST_DB_NAME must end with _test');
    }
    const conn = await mariadb.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${cfg.database}\``);
    await conn.query(`CREATE DATABASE \`${cfg.database}\` CHARACTER SET utf8mb4`);
    await conn.end();
    store = await Store.connect(cfg);
  });

  after(async () => {
    await store?.close();
  });

  test('migrations are idempotent', async () => {
    const again = await Store.connect(cfg);
    await again.close();
  });

  test('a table keeps the ten best, ties below, and drops the others from the database', async () => {
    // Rising scores: each one is the best so far.
    for (let i = 1; i <= 10; i++) assert.equal((await store.submit('cheesy', '7', `P${i}`, String(i * 10))).place, 0);
    assert.equal((await store.submit('cheesy', '7', 'Tie', '50')).place, 6);
    const low = await store.submit('cheesy', '7', 'Low', '5');
    assert.equal(low.place, -1);
    assert.deepEqual(
      low.table.map((e) => e.name),
      ['P10', 'P9', 'P8', 'P7', 'P6', 'P5', 'Tie', 'P4', 'P3', 'P2'],
    );
    const [row] = await store.pool.query<{ n: number }[]>(
      "SELECT COUNT(*) AS n FROM scores WHERE game = 'cheesy' AND table_key = '7'",
    );
    assert.equal(Number(row?.n), 10);
  });

  test('lower is better for times; tables are separate', async () => {
    await store.submit('match', '0', 'Slow', '2:10');
    assert.equal((await store.submit('match', '0', 'Fast', '1:05')).place, 0);
    await store.submit('match', '1', 'Other', '0:59');
    const tables = await store.tables('match');
    assert.deepEqual(
      tables['0']?.map((e) => e.name),
      ['Fast', 'Slow'],
    );
    assert.deepEqual(tables['1'], [{ name: 'Other', score: '0:59' }]);
  });

  test('concurrent submissions to one table keep it consistent', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => store.submit('stackblz', '0', `C${i}`, String(i))));
    const table = (await store.tables('stackblz'))['0']!;
    assert.deepEqual(
      table.map((e) => e.score),
      ['24', '23', '22', '21', '20', '19', '18', '17', '16', '15'],
    );
  });

  test('names keep their characters (utf8mb4)', async () => {
    await store.submit('quinto', '25', 'Zoë 🎲', '15');
    assert.equal((await store.tables('quinto'))['25']?.[0]?.name, 'Zoë 🎲');
  });
});
