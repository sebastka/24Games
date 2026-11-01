// The framework's message boxes: StarView WarningBoxes with Yes and No (CZGAME32.DLL message
// boxes 1000 and 1001), and plain message boxes with OK.
import { Dialog } from '../../../shell/Dialog.tsx';

/** "Changing the game options will restart the game in progress.  Are you sure…" (box 1000). */
export const CONFIRM_OPTIONS =
  'Changing the game options will restart the game in progress.  Are you sure you want to do this?';
/** Game › New during a game (box 1001). */
export const CONFIRM_NEW = 'Are you sure you want to abandon the game in progress?';

export function ConfirmBox(props: { title: string; text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Dialog
      title={props.title}
      buttons={[
        { label: '~Yes', primary: true, onClick: props.onYes },
        { label: '~No', cancel: true, onClick: props.onNo },
      ]}
    >
      <p className="message warning">{props.text}</p>
    </Dialog>
  );
}

export function MessageBox(props: { title: string; text: string; onOk: () => void }) {
  return (
    <Dialog title={props.title} buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}>
      <p className="message info">{props.text}</p>
    </Dialog>
  );
}
