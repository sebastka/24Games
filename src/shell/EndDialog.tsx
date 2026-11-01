// The end-of-game dialogs of CZGAME32.DLL (dialogs 1002 "You Lose!", 1003 "You Win!", 1004 "It's
// A Tie!"; FUN_00406720, FUN_00406840, FUN_00406960 in reversi.exe, FUN_004067a0 in match.exe),
// shared by every game: 320×200 without a title bar, a 120×200 picture (bitmaps 1001-1003: a
// thumb down, a thumb up, a stopwatch; their masks on the right), the heading in maroon, two navy
// lines and OK under them. The picture is on the left, on the right for "You Win!".
import iwin from '../assets/shared/czgame/iwin2.png';
import tie from '../assets/shared/czgame/tie2.png';
import youwin from '../assets/shared/czgame/youwin2.png';
import { Dialog, DialogButtons } from './Dialog.tsx';
import { MaskedSprite } from './MaskedSprite.tsx';
import './end-dialog.css';

export type Outcome = 'lose' | 'win' | 'tie';

const HEADINGS: Record<Outcome, string> = { lose: 'You Lose!', win: 'You Win!', tie: "It's A Tie!" };
const PICTURES: Record<Outcome, string> = { lose: iwin, win: youwin, tie };

/**
 * `lines`: the two lines under the heading ("Your Score : 4", "My Score : 60"; the second may be
 * empty); `heading` replaces "You Win!"… when a game sets its own. `title` names the dialog (for
 * screen readers: it has no title bar).
 */
export function EndDialog(props: {
  title: string;
  outcome: Outcome;
  lines: readonly string[];
  heading?: string;
  onOk: () => void;
}) {
  const { outcome } = props;
  const buttons = [{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }];
  return (
    <Dialog title={props.title} className={`end-of-game ${outcome}`} buttons={buttons} untitled noFooter>
      <div className="end-layout">
        <MaskedSprite key={outcome} src={PICTURES[outcome]} width={120} height={200} className="end-picture" />
        <div className="end-texts">
          <p className="end-title">{props.heading ?? HEADINGS[outcome]}</p>
          <p>{props.lines[0]}</p>
          <p>{props.lines[1]}</p>
          <DialogButtons buttons={buttons} className="end-ok" />
        </div>
      </div>
    </Dialog>
  );
}
