import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { config, validateConfig } from './config.ts';
import { Store, type DbConfig } from './db.ts';

validateConfig();
const store = config.db.host ? await Store.connect(config.db as DbConfig) : null;
const app = createApp({
  store,
  scoresPerMinute: config.scoresPerMinute,
  publicUrl: config.http.publicUrl,
  staticDir: config.staticDir,
});

const server = serve({ fetch: app.fetch, hostname: config.http.host, port: config.http.port }, (info) => {
  const db = config.db;
  console.log(
    `24Games listening on http://${info.address}:${info.port}, high scores ` +
      (store ? `shared in ${db.user}@${db.host}:${db.port}/${db.database}` : 'kept in each browser (no DB_HOST)'),
  );
});

// Graceful shutdown on SIGTERM (docker stop, Kubernetes) and SIGINT (Ctrl+C). Node runs as
// PID 1 in the container, where signals without a handler are ignored, so these handlers are
// what makes the container stop promptly.
const SHUTDOWN_TIMEOUT_MS = 8000; // below Docker's default 10 s grace period
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    console.warn(`${signal} received again, exiting immediately`);
    process.exit(1);
  }
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  setTimeout(() => {
    console.error(`shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS / 1000} s, exiting`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  // Stop accepting connections (idle keep-alive connections are closed), let the requests in
  // flight finish, then close the database pool.
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await store?.close();
  console.log('shutdown complete');
  process.exit(0);
}
process.on('SIGINT', (s) => void shutdown(s));
process.on('SIGTERM', (s) => void shutdown(s));
