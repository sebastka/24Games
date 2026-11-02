// HTTP API of the shared high score tables, and (in production) the static site.
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { cleanName, cleanScore, isTableKey, SCORE_GAMES } from '../shared/highscores.ts';
import { config } from './config.ts';
import type { ScoreStore } from './db.ts';

/** The site's Content Security Policy: everything from the site itself, nothing inline. */
const CSP = {
  defaultSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  mediaSrc: ["'self'"],
  styleSrc: ["'self'"],
  scriptSrc: ["'self'"],
  connectSrc: ["'self'"],
  workerSrc: ["'self'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
  frameAncestors: ["'none'"],
};

/**
 * Rejects cross-site score submissions, from the browser-provided Fetch Metadata and Origin
 * headers (there is no session to forge, but another site must not fill the tables).
 */
export function sameOriginGuard(publicUrl: string | undefined): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'OPTIONS') return next();
    const site = c.req.header('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') return c.json({ error: 'cross-site request refused' }, 403);
    const origin = c.req.header('origin');
    if (origin && !site) {
      const expected = publicUrl ?? `${new URL(c.req.url).protocol}//${c.req.header('host')}`;
      if (new URL(origin).origin !== new URL(expected).origin) {
        return c.json({ error: 'cross-origin request refused' }, 403);
      }
    }
    return next();
  };
}

/** At most `limit` accepted submissions per table and per minute (sliding window, in memory). */
export function rateLimiter(limit: number, now: () => number = Date.now): (key: string) => boolean {
  const recent = new Map<string, number[]>();
  return (key) => {
    const t = now();
    const times = (recent.get(key) ?? []).filter((at) => t - at < 60_000);
    const allowed = times.length < limit;
    if (allowed) times.push(t);
    recent.set(key, times);
    return allowed;
  };
}

export interface AppOptions {
  /** The shared tables, or null when no database is configured (each browser keeps its own). */
  store: ScoreStore | null;
  scoresPerMinute?: number;
  publicUrl?: string | undefined;
  staticDir?: string;
}

export function createApp({ store, scoresPerMinute = 30, publicUrl, staticDir }: AppOptions): Hono {
  const app = new Hono();
  const allow = rateLimiter(scoresPerMinute);

  app.onError((err, c) => {
    // A refusal by Hono's middleware (413 from the body limit…), not a failure.
    if (err instanceof HTTPException) return err.getResponse();
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: CSP,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: 'same-origin',
      xFrameOptions: 'DENY',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    }),
  );
  app.use('/api/*', sameOriginGuard(publicUrl));

  app.get('/api/health', (c) => c.json({ ok: true }));

  const game = (id: string | undefined) => (id && Object.hasOwn(SCORE_GAMES, id) ? id : null);

  // The high score tables of a game, if the instance shares them (else the games keep their own).
  app.get('/api/scores/:game', async (c) => {
    const id = game(c.req.param('game'));
    if (!id) return c.json({ error: 'not found' }, 404);
    if (!store) return c.json({ shared: false });
    return c.json({ shared: true, tables: await store.tables(id) });
  });

  // A finished game's score. The server ranks it: the browser's place is only a guess.
  app.post('/api/scores/:game/:table', bodyLimit({ maxSize: 1024 }), async (c) => {
    const id = game(c.req.param('game'));
    const table = c.req.param('table');
    if (!id || !isTableKey(table)) return c.json({ error: 'not found' }, 404);
    if (!store) return c.json({ error: 'high scores are not shared on this instance' }, 404);
    const body = (await c.req.json().catch(() => null)) as { name?: unknown; score?: unknown } | null;
    const name = cleanName(body?.name);
    const score = cleanScore(body?.score);
    if (!name || !score) return c.json({ error: 'a name and a score are required' }, 400);
    if (!allow(`${id}/${table}`)) return c.json({ error: 'too many scores, try again in a minute' }, 429);
    return c.json(await store.submit(id, table, name, score));
  });

  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));

  const dir = staticDir ?? config.staticDir;
  if (existsSync(dir)) {
    // serveStatic resolves paths relative to the working directory.
    const root = relative(process.cwd(), dir) || '.';
    // Hashed build output: cached forever. The page itself is always revalidated, so a new
    // release is picked up on the next load.
    app.use('*', async (c, next) => {
      await next();
      if (c.req.path.startsWith('/api/')) return;
      const immutable = c.req.path.startsWith('/assets/') && c.res.ok;
      c.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    });
    app.use('/*', serveStatic({ root }));
    app.get('*', serveStatic({ root, path: 'index.html' }));
  } else {
    app.get('/', (c) => c.text('Site not built. Run "npm run build", or use "npm run dev" and open Vite.', 404));
  }

  return app;
}
