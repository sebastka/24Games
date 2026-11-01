// The games' message boxes: StarView's WarningBox with Yes and No (CZGAME32.DLL messages 1000,
// 1001 and 3000), and the plain boxes with OK.
import { Dialog, type MessageIcon } from './Dialog.tsx';

/** OK in Options during a game (CZGAME32.DLL message 1000; the original has two spaces). */
export const CONFIRM_OPTIONS =
  'Changing the game options will restart the game in progress.  Are you sure you want to do this?';
/** Game › New during a game (CZGAME32.DLL message 1001). */
export const CONFIRM_NEW = 'Are you sure you want to abandon the game in progress?';

/** A question with Yes (Enter) and No (Escape), and the warning icon. */
export function ConfirmBox(props: { title: string; text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Dialog
      title={props.title}
      icon="warning"
      buttons={[
        { label: '~Yes', primary: true, onClick: props.onYes },
        { label: '~No', cancel: true, onClick: props.onNo },
      ]}
    >
      {props.text}
    </Dialog>
  );
}

/** A message with OK; `icon` none for the games' plain message boxes. */
export function MessageBox(props: {
  title: string;
  text: string;
  icon?: MessageIcon;
  className?: string;
  onOk: () => void;
}) {
  const buttons = [{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }];
  return props.icon ? (
    <Dialog title={props.title} icon={props.icon} className={props.className} buttons={buttons}>
      {props.text}
    </Dialog>
  ) : (
    <Dialog title={props.title} className={props.className} buttons={buttons}>
      <p className="message">{props.text}</p>
    </Dialog>
  );
}
