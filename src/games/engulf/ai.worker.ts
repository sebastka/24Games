// The computer's search off the main thread: Expert (4 plies) can take a second on a phone.
import { scoreMoves, type Board } from './logic.ts';

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<{ board: Board; skill: number }>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (e) => scope.postMessage(scoreMoves(e.data.board, e.data.skill));
