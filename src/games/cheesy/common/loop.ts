// Shared by the arcade games (Cheesy Pursuit, Think Tank, MazeRace): the fixed-step loop that
// stands in for the originals' StarView timers, and helpers to draw like them.
import { useEffect, useRef } from 'react';

/**
 * Whether the window's own UI blocks the game: a modal dialog or an open menu. The originals
 * stop their timers while a menu or a dialog is up (the menu handlers pause the game).
 */
export const uiBlocked = (): boolean => document.querySelector('.modal, .menubar [aria-expanded="true"]') !== null;

/**
 * Calls `tick` every `tickMs` milliseconds of game time, on requestAnimationFrame, while
 * `running` (and the UI does not block it). Time does not pass while the tab is hidden (no
 * animation frames) or blocked; a long frame catches up at most a quarter of a second.
 */
export function useFixedStep(tickMs: number, running: boolean, tick: () => void): void {
  const callback = useRef(tick);
  useEffect(() => {
    callback.current = tick;
  });
  useEffect(() => {
    if (!running) return;
    let last: number | null = null;
    let lag = 0;
    let id = 0;
    const frame = (now: number) => {
      if (last !== null && !uiBlocked()) {
        lag += Math.min(now - last, 250);
        while (lag >= tickMs) {
          lag -= tickMs;
          callback.current();
        }
      }
      last = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running, tickMs]);
}

/** Whether the device has a coarse pointer (a touch screen): the on-screen pad is shown. */
export const coarsePointer = (): boolean => window.matchMedia?.('(pointer: coarse)').matches ?? false;
