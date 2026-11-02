import { resolve } from 'node:path';

function str(name: string, fallback?: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : fallback;
}

function int(name: string, fallback: number): number {
  const v = str(name);
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) throw new Error(`${name} must be an integer, got "${v}"`);
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const v = str(name)?.toLowerCase();
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v);
}

export const config = {
  /** The shared high score tables. Without DB_HOST, each browser keeps its own (localStorage). */
  db: {
    host: str('DB_HOST'),
    port: int('DB_PORT', 3306),
    user: str('DB_USER', '24games')!,
    password: str('DB_PASSWORD'),
    database: str('DB_NAME', '24games')!,
    connectionLimit: int('DB_POOL_SIZE', 5),
    ssl: bool('DB_TLS', false),
  },
  http: {
    host: str('LISTEN_HOST', '127.0.0.1')!,
    port: int('PORT', 3000),
    /** External origin (scheme + host), checked against the Origin of score submissions. Optional. */
    publicUrl: str('PUBLIC_URL')?.replace(/\/+$/, ''),
  },
  /** Scores accepted per table and per minute, against floods (the games send one per finished game). */
  scoresPerMinute: int('SCORES_PER_MINUTE', 30),
  // Relative to this file, so the image works whatever the working directory is.
  staticDir: resolve(str('STATIC_DIR') ?? resolve(import.meta.dirname, '../../dist')),
};

export type Config = typeof config;

/** Fails fast on configuration that would otherwise break later. */
export function validateConfig(cfg: Config = config): void {
  if (cfg.db.host && !cfg.db.password) throw new Error('DB_PASSWORD is required with DB_HOST');
  if (cfg.scoresPerMinute < 1) throw new Error('SCORES_PER_MINUTE must be at least 1');
  if (cfg.http.publicUrl) {
    const u = new URL(cfg.http.publicUrl);
    if (u.pathname !== '/' || u.search) {
      throw new Error('PUBLIC_URL must be an origin without a path, e.g. https://games.example.com');
    }
  }
}
