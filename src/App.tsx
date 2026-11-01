import { Suspense, useSyncExternalStore } from 'react';
import { PLAYABLE } from './games/index.ts';
import Launcher from './launcher/Launcher.tsx';

// Routes are hashes (#/bulldoze), so that the static files need no server-side routing.
const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const route = () => window.location.hash.replace(/^#\/?/, '');

export default function App() {
  const id = useSyncExternalStore(subscribe, route);
  const Game = PLAYABLE[id];
  const go = (to: string) => {
    window.location.hash = to ? `/${to}` : '';
  };

  return (
    <main className="desktop">
      {Game ? (
        <Suspense fallback={<p className="loading">Loading…</p>}>
          <Game onExit={() => go('')} />
        </Suspense>
      ) : (
        <Launcher onRun={go} />
      )}
    </main>
  );
}
