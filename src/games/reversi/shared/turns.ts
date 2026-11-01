// Turns as async sequences (animations, the computer thinking, message boxes to acknowledge),
// stopped when a new game starts: each step after an `await` calls `alive()`, which throws once
// the game it belongs to has been replaced.
import { useEffect, useRef, useState } from 'react';

const ABORTED = Symbol('aborted');

export interface Turns {
  /** A turn is running: the board ignores the player. */
  busy: boolean;
  /** Runs a turn. `signal` aborts its animations when the game is replaced. */
  run: (turn: (alive: () => void, signal: AbortSignal) => Promise<void>) => void;
  /** Stops the running turn (new game, closing the window). */
  stop: () => void;
}

export function useTurns(): Turns {
  const game = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = () => {
    game.current++;
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
  };

  const run: Turns['run'] = (turn) => {
    const id = game.current;
    abort.current ??= new AbortController();
    const signal = abort.current.signal;
    const alive = () => {
      if (game.current !== id) throw ABORTED;
    };
    setBusy(true);
    turn(alive, signal)
      .catch((e: unknown) => {
        if (e !== ABORTED) throw e;
      })
      .finally(() => {
        if (game.current === id) setBusy(false);
      });
  };

  // Closing the window stops everything.
  useEffect(() => stop, []);

  return { busy, run, stop };
}

/** Waits a little, so that the browser paints (the hourglass) before the computer thinks. */
export const pause = (ms = 50): Promise<void> => new Promise((r) => setTimeout(r, ms));
