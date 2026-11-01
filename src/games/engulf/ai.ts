// Scores the computer's moves in a worker when the browser has them, on the main thread otherwise.
import { scoreMoves, type Board, type Scored } from './logic.ts';

let worker: Worker | null = null;

export function scoreInBackground(board: Board, skill: number): Promise<Scored> {
  try {
    worker ??= new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve(scoreMoves(board, skill));
  }
  const w = worker;
  return new Promise((resolve) => {
    w.onmessage = (e: MessageEvent<Scored>) => resolve(e.data);
    w.onerror = () => resolve(scoreMoves(board, skill));
    w.postMessage({ board, skill });
  });
}
