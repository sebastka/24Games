import { lazy, type ComponentType } from 'react';

export interface GameProps {
  onExit: () => void;
}

// Each game is src/games/<id>/Game.tsx (default export), <id> being the original executable's
// name (bulldoze, reversi…); found here, and loaded on demand.
const modules = import.meta.glob<{ default: ComponentType<GameProps> }>('./*/Game.tsx');

/** The games ported so far, by id. */
export const PLAYABLE: Record<string, ComponentType<GameProps>> = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [path.split('/')[1]!, lazy(load)]),
);
