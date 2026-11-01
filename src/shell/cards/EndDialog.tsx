// CZGAME32.DLL's end-of-game dialogs (1002 "You Lose!", 1003 "You Win!"; FUN_00407e41 and
// FUN_00407f40 in siege.exe, FUN_00409220 in pokermat.exe): up to two lines of text beside a
// hand, thumb up on the right for a win, thumb down on the left for a loss.
import youLose from '../../assets/cards/you-lose.png';
import youWin from '../../assets/cards/you-win.png';
import { Dialog } from '../Dialog.tsx';
import './cards.css';

export function EndDialog(props: {
  title: string;
  outcome: 'win' | 'lose';
  lines: [string, string];
  onClose: () => void;
}) {
  const win = props.outcome === 'win';
  return (
    <Dialog
      title={props.title}
      className="card-end-dialog"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onClose }]}
    >
      <div className={`card-end ${props.outcome}`}>
        <div className="texts">
          <p className="heading">{win ? 'You Win!' : 'You Lose!'}</p>
          <p>{props.lines[0]}</p>
          <p>{props.lines[1]}</p>
        </div>
        <img src={win ? youWin : youLose} alt="" width={120} height={200} />
      </div>
    </Dialog>
  );
}
