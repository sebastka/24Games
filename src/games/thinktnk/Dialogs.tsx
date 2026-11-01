import { Dialog } from '../../shell/Dialog.tsx';

/** Dialog 257 at the end of a level (FUN_00408ff0): the bonuses and the next level. */
export function LevelDialog(props: { level: number; timeBonus: number; bonus: number; onOk: () => void }) {
  return (
    <Dialog
      title="Level Complete!"
      className="tank-dialog"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <p className="navy" style={{ top: 10 }}>
        Time Bonus = {props.timeBonus}
      </p>
      <p className="navy" style={{ top: 40 }}>
        Peace/War Bonus = {props.bonus}
      </p>
      <p className="red" style={{ top: 100 }}>
        Prepare For Level {props.level + 1}
      </p>
    </Dialog>
  );
}

/** Dialog 258 when the tank is destroyed and tanks are left (FUN_00409240). */
export function OuchDialog(props: { level: number; tanks: number; onOk: () => void }) {
  return (
    <Dialog
      title="Ouch!"
      className="tank-dialog"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <p className="red big" style={{ top: 10 }}>
        TANK DESTROYED!
      </p>
      <p className="navy" style={{ top: 55 }}>
        Tanks Remaining = {props.tanks}
      </p>
      <p className="red" style={{ top: 100 }}>
        Continuing Level {props.level}
      </p>
    </Dialog>
  );
}
