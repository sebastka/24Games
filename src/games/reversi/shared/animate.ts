// The framework's piece animation (`FUN_00404b00`): a sprite slides in a straight line,
// `speed` pixels per step (Options › Animation: 1 slow … 15 fast), a step every few
// milliseconds (the original waits a CPU-calibrated busy loop, "AnimationDelay").

export interface Point {
  x: number;
  y: number;
}

/** Milliseconds per animation step: about what the busy loop took on a period Pentium. */
export const STEP_MS = 4;

/** Where a sprite moving from `from` to `to` at `speed` is after `elapsed` ms, and whether it arrived. */
export function slide(from: Point, to: Point, speed: number, elapsed: number): { at: Point; done: boolean } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const travelled = speed * Math.floor(elapsed / STEP_MS);
  if (speed <= 0 || travelled >= length) return { at: to, done: true };
  return {
    at: { x: Math.trunc(from.x + (dx * travelled) / length), y: Math.trunc(from.y + (dy * travelled) / length) },
    done: false,
  };
}

/**
 * Runs a slide on animation frames, calling `frame` with each position, and resolves once the
 * sprite has arrived (at once when animation is disabled). `signal` aborts it (resolving).
 */
export function animate(
  from: Point,
  to: Point,
  speed: number,
  frame: (at: Point) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (speed <= 0 || signal?.aborted) {
      resolve();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const { at, done } = slide(from, to, speed, now - start);
      frame(at);
      if (done) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
