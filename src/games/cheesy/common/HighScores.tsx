import { useState } from 'react';
import blueRibbon from '../../../assets/shared/czgame/blue_ri2.png';
import flag from '../../../assets/shared/czgame/flag2.png';
import redRibbon from '../../../assets/shared/czgame/red_rib2.png';
import { Dialog } from '../../../shell/Dialog.tsx';
import { useMasked } from './draw.ts';
import type { Table } from './highscores.ts';

/**
 * The high score table (CZGAME32.DLL dialog 3000, painted by FUN_0040dd80): the chequered flag
 * (flag2.bmp), then ten rows of place, name and score boxes, each row 27 pixels lower and 11
 * pixels further right. "Clear Scores" asks first (message 3000).
 */
export function HighScoreDialog(props: { title: string; table: Table; onClose: () => void; onClear: () => void }) {
  const art = useMasked(flag, 'right');
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        title={props.title}
        className="high-scores"
        buttons={[
          { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
          { label: 'Clear Scores', onClick: () => setConfirm(true) },
        ]}
      >
        <div className="hall">
          {art && <img src={art} alt="" width={351} height={302} className="flag" />}
          {props.table.map((entry, i) => (
            <div key={i} className="row" style={{ top: 10 + 27 * i, left: 10 + 11 * i }}>
              <span className="place">{i + 1}</span>
              <span className="name">{entry?.name}</span>
              <span className="score">{entry?.score}</span>
            </div>
          ))}
        </div>
      </Dialog>
      {confirm && (
        <Dialog
          title={props.title}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setConfirm(false);
                props.onClear();
              },
            },
            { label: '~No', cancel: true, onClick: () => setConfirm(false) },
          ]}
        >
          <p className="message warning">Are you sure you want to clear the scores in the high score table?</p>
        </Dialog>
      )}
    </>
  );
}

/** "Congratulations!" (CZGAME32.DLL dialog 3001): the name for a new high score, between ribbons. */
export function NameDialog(props: { title: string; name: string; onOk: (name: string) => void }) {
  const blue = useMasked(blueRibbon, 'right');
  const red = useMasked(redRibbon, 'right');
  const [name, setName] = useState(props.name);
  return (
    <Dialog
      title={props.title}
      className="name-entry"
      buttons={[{ label: 'OK', primary: true, onClick: () => props.onOk(name.trim()) }]}
    >
      <div className="congratulations">
        {blue && <img src={blue} alt="" width={68} height={100} />}
        <div>
          <p className="big">Congratulations!</p>
          <p>
            You have a high score.
            <br />
            Please enter your name
          </p>
          <input
            type="text"
            aria-label="Your name"
            maxLength={30}
            autoComplete="nickname"
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
        {red && <img src={red} alt="" width={68} height={100} />}
      </div>
    </Dialog>
  );
}
