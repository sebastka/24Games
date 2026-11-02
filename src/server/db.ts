// MariaDB persistence of the shared high score tables.
import mariadb, { type Pool, type PoolConnection } from 'mariadb';
import { placeOf, SCORE_GAMES, scoreValue, TABLE_SIZE, type Entry } from '../shared/highscores.ts';

/**
 * Ordered schema migrations. Never edit an applied migration; append a new one.
 * Each entry is a list of statements (the driver runs one statement per query).
 */
const MIGRATIONS: string[][] = [
  [
    // One row per table ever written to: locked to serialise the submissions to a table.
    `CREATE TABLE score_tables (
       game      VARCHAR(16) NOT NULL,
       table_key VARCHAR(32) NOT NULL,
       PRIMARY KEY (game, table_key)
     )`,
    // The entries: at most TABLE_SIZE per table, the others are deleted as they drop out.
    `CREATE TABLE scores (
       id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
       game       VARCHAR(16)  NOT NULL,
       table_key  VARCHAR(32)  NOT NULL,
       name       VARCHAR(30)  NOT NULL,
       score      VARCHAR(16)  NOT NULL,
       value      BIGINT       NOT NULL,
       created_at DATETIME     NOT NULL,
       KEY scores_table (game, table_key),
       CONSTRAINT scores_table FOREIGN KEY (game, table_key) REFERENCES score_tables (game, table_key)
         ON DELETE CASCADE
     )`,
  ],
];

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string | undefined;
  database: string;
  connectionLimit?: number;
  ssl?: boolean;
}

/** What the HTTP API needs from the storage (a fake in the API tests). */
export interface ScoreStore {
  /** The tables of `game` that have entries, best first. */
  tables(game: string): Promise<Record<string, Entry[]>>;
  /** Enters a score if it makes the table (`place` -1 otherwise); returns the table after it. */
  submit(game: string, table: string, name: string, score: string): Promise<{ place: number; table: Entry[] }>;
}

// The driver returns loosely typed rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** The order of a table: best first; a tie goes to the earlier score (as `placeOf`). */
const order = (game: string): string => `value ${SCORE_GAMES[game]?.lowerIsBetter ? 'ASC' : 'DESC'}, id ASC`;

export class Store implements ScoreStore {
  readonly pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  /** Connects and applies pending migrations. */
  static async connect(cfg: DbConfig): Promise<Store> {
    const pool = mariadb.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectionLimit: cfg.connectionLimit ?? 5,
      ssl: cfg.ssl ? { rejectUnauthorized: true } : undefined,
      dateStrings: true,
      bigIntAsNumber: true,
      insertIdAsNumber: true,
      charset: 'utf8mb4',
    });
    const store = new Store(pool);
    try {
      await store.migrate();
    } catch (e) {
      await pool.end();
      throw e;
    }
    return store;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async migrate(): Promise<void> {
    await this.withConnection(async (conn) => {
      // Serialise migrations when several instances start at once.
      const [lock] = await conn.query<Row[]>("SELECT GET_LOCK('24games_migrate', 60) AS ok");
      if (lock?.ok !== 1) throw new Error('could not acquire the migration lock');
      try {
        await conn.query(
          'CREATE TABLE IF NOT EXISTS schema_migrations (version INT UNSIGNED NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL)',
        );
        const [row] = await conn.query<Row[]>('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations');
        for (let v = Number(row?.v ?? 0); v < MIGRATIONS.length; v++) {
          // DDL commits implicitly in MariaDB, so a failed migration must be fixed by hand.
          for (const stmt of MIGRATIONS[v]!) await conn.query(stmt);
          await conn.query('INSERT INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', [v + 1]);
        }
      } finally {
        await conn.query("SELECT RELEASE_LOCK('24games_migrate')");
      }
    });
  }

  private async withConnection<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      await conn.release();
    }
  }

  async tables(game: string): Promise<Record<string, Entry[]>> {
    const rows = await this.pool.query<Row[]>(
      `SELECT table_key, name, score FROM scores WHERE game = ? ORDER BY table_key, ${order(game)}`,
      [game],
    );
    const out: Record<string, Entry[]> = {};
    for (const r of rows) (out[r.table_key as string] ??= []).push({ name: r.name, score: r.score });
    return out;
  }

  async submit(game: string, table: string, name: string, score: string): Promise<{ place: number; table: Entry[] }> {
    return this.withConnection(async (conn) => {
      // The table's row, created before the transaction (concurrent first submissions inserting it
      // inside their transactions would deadlock), then locked until the commit: submissions to
      // one table run one at a time.
      await conn.query('INSERT IGNORE INTO score_tables (game, table_key) VALUES (?, ?)', [game, table]);
      await conn.beginTransaction();
      try {
        await conn.query('SELECT 1 FROM score_tables WHERE game = ? AND table_key = ? FOR UPDATE', [game, table]);
        const current = await conn.query<Row[]>(
          `SELECT id, name, score FROM scores WHERE game = ? AND table_key = ? ORDER BY ${order(game)}`,
          [game, table],
        );
        const entries = current.map((r) => ({ name: r.name as string, score: r.score as string }));
        const place = placeOf(entries, score, SCORE_GAMES[game]?.lowerIsBetter);
        if (place >= 0) {
          await conn.query(
            `INSERT INTO scores (game, table_key, name, score, value, created_at)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [game, table, name, score, scoreValue(score)],
          );
          // The entries pushed out of the table (a full table loses its last one).
          const stale = current.slice(TABLE_SIZE - 1).map((r) => r.id as number);
          if (stale.length)
            await conn.query(`DELETE FROM scores WHERE id IN (${stale.map(() => '?').join(', ')})`, stale);
        }
        const after = await conn.query<Row[]>(
          `SELECT name, score FROM scores WHERE game = ? AND table_key = ? ORDER BY ${order(game)} LIMIT ?`,
          [game, table, TABLE_SIZE],
        );
        await conn.commit();
        return { place, table: after.map((r) => ({ name: r.name as string, score: r.score as string })) };
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    });
  }
}
