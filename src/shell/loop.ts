// The real-time games' timers (StarView Timers in the originals) on requestAnimationFrame: time
// passes in fixed steps of game time, not frames, and stops while the tab is hidden, a dialog is
// open or a menu is pulled down (the originals' menu and dialog handlers stop their timers).
import { useEffect, useRef } from 'react';

/** Longest stretch of time simulated at once (after a stall): a timer would not catch up either. */
export const MAX_FRAME_MS = 250;

/**
 * Calls `frame` with the milliseconds elapsed since the previous animation frame (at most
 * MAX_FRAME_MS), while `running` and the tab is visible. `onResume` is called when the loop
 * (re)starts and after the tab was hidden: the originals restart their timers then.
 */
export function useFrameLoop(running: boolean, frame: (elapsed: number) => void, onResume?: () => void): void {
  const callbacks = useRef({ frame, onResume });
  useEffect(() => {
    callbacks.current = { frame, onResume };
  });
  useEffect(() => {
    if (!running) return;
    callbacks.current.onResume?.();
    let id = 0;
    let last: number | null = null;
    let hidden = false;
    const loop = (now: number) => {
      id = requestAnimationFrame(loop);
      if (document.hidden || last === null) {
        hidden ||= document.hidden;
        last = now;
        return;
      }
      if (hidden) {
        hidden = false;
        callbacks.current.onResume?.();
      }
      const elapsed = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      callbacks.current.frame(elapsed);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

/** Calls `tick` every `tickMs` milliseconds of game time, while `running` (see useFrameLoop). */
export function useFixedStep(tickMs: number, running: boolean, tick: () => void): void {
  const lag = useRef(0);
  useFrameLoop(running, (elapsed) => {
    lag.current += elapsed;
    while (lag.current >= tickMs) {
      lag.current -= tickMs;
      tick();
    }
  });
}

/** Whether the device has a coarse pointer (a touch screen): the on-screen pad is shown. */
export const coarsePointer = (): boolean => window.matchMedia?.('(pointer: coarse)').matches ?? false;
