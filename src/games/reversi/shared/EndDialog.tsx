// The end-of-game dialogs of CZGAME32.DLL (dialogs 1002-1004, `FUN_00406720`, `FUN_00406840`,
// `FUN_00406960`): a hand (thumb down, thumb up, a stopwatch), a title and two score lines.
import { useEffect, useRef } from 'react';
import { Dialog } from '../../../shell/Dialog.tsx';
import { END_PICTURES } from './assets.ts';
import { useMaskedSheet } from './sprites.ts';

export type Outcome = 'lose' | 'win' | 'tie';

const TITLES: Record<Outcome, string> = { lose: 'You Lose!', win: 'You Win!', tie: "It's A Tie!" };

/**
 * `lines` are the two score lines ("Your Score : 4", "My Score : 60"); `heading` replaces the
 * title when a game sets its own ("I got four in a row!"…).
 */
export function EndDialog(props: {
  title: string;
  outcome: Outcome;
  lines: [string, string];
  heading?: string;
  onClose: () => void;
}) {
  const { outcome } = props;
  const picture = useMaskedSheet(END_PICTURES[outcome], 120, 1);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !picture) return;
    ctx.clearRect(0, 0, 120, 200);
    ctx.drawImage(picture, 0, 0);
  }, [picture]);
  return (
    // The dialog's own OK sits under the texts; the footer's (hidden) keeps Enter and Escape.
    <Dialog
      title={props.title}
      className={`end-of-game ${outcome}`}
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onClose }]}
    >
      <div className="end-layout">
        <canvas ref={canvas} width={120} height={200} aria-hidden="true" />
        <div className="end-texts">
          <p className="end-title">{props.heading ?? TITLES[outcome]}</p>
          <p>{props.lines[0]}</p>
          <p>{props.lines[1]}</p>
          <button type="button" className="primary" onClick={props.onClose}>
            OK
          </button>
        </div>
      </div>
    </Dialog>
  );
}
