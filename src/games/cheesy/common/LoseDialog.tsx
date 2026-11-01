import iWin from '../../../assets/shared/czgame/iwin2.png';
import { Dialog } from '../../../shell/Dialog.tsx';
import { useMasked } from './draw.ts';

/**
 * "You Lose!" (CZGAME32.DLL dialog 1002, FUN_0040b000): the thumbs-down hand (iwin2.bmp) on the
 * left, then two lines of explanation.
 */
export function LoseDialog(props: { title: string; lines: [string, string]; onOk: () => void }) {
  const art = useMasked(iWin, 'right');
  return (
    <Dialog
      title={props.title}
      className="lose"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <div className="verdict">
        <div className="art">{art && <img src={art} alt="" width={120} height={200} />}</div>
        <div className="words">
          <p className="big">You Lose!</p>
          <p>{props.lines[0]}</p>
          <p>{props.lines[1]}</p>
        </div>
      </div>
    </Dialog>
  );
}
