// The framework's piece animation (`FUN_00404b00`): a sprite slides in a straight line,
// `speed` pixels per step (Options › Animation: 1 slow … 15 fast, 0 disabled), a step every few
// milliseconds (the original waits a busy loop between steps, "AnimationDelay" × 10 iterations
// calibrated from the processor type, 6000-14000: a few milliseconds on the machines of the time).

export interface Point {
  x: number;
  y: number;
}

/** Animation speed when the registry has none (`AnimationSpeed`). */
export const DEFAULT_SPEED = 7;

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
 * Runs a slide on animation frames, calling `frame` with each position (the last one `to`), and
 * resolves once the sprite has arrived (at once when animation is disabled). `stop`, an abort
 * signal or a function telling that the game moved on, ends it early (resolving, without more
 * frames).
 */
export function animate(
  from: Point,
  to: Point,
  speed: number,
  frame: (at: Point) => void,
  stop?: AbortSignal | (() => boolean),
): Promise<void> {
  const stopped = () => (typeof stop === 'function' ? stop() : (stop?.aborted ?? false));
  return new Promise((resolve) => {
    if (speed <= 0 || stopped()) {
      resolve();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      if (stopped()) {
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
