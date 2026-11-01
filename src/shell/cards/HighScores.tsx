// The "Hall of Fame" dialogs linked into Poker Patience and Poker Machine (CZGAME32.DLL dialogs
// 3000 and 3001, painted by FUN_00401d1e and FUN_00402088 in pokergrd.exe): the table on a
// chequered flag, and the name entry between two rosettes.
import { useState } from 'react';
import blueRibbon from '../../assets/cards/blue-ribbon.png';
import flag from '../../assets/cards/flag.png';
import redRibbon from '../../assets/cards/red-ribbon.png';
import { Dialog } from '../Dialog.tsx';
import { TABLE_SIZE, type ScoreEntry } from './scores.ts';
import './cards.css';

/** Game › Show High Scores: OK, or Clear Scores (after a confirmation). */
export function HallOfFame(props: {
  title: string;
  table: readonly ScoreEntry[];
  onClear: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        title="Hall of Fame"
        className="card-hall-of-fame"
        buttons={[
          { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
          { label: 'Clear Scores', onClick: () => setConfirm(true) },
        ]}
      >
        <div className="flag" aria-label={props.title} role="table">
          <img src={flag} alt="" width={351} height={302} />
          {Array.from({ length: TABLE_SIZE }, (_, i) => {
            const entry = props.table[i];
            // Each row is 11 pixels further right than the one above: along the flag.
            const style = { left: 11 * i, top: 27 * i };
            return (
              <div key={i} className="row" style={style} role="row">
                <span className="rank" role="cell">
                  {i + 1}
                </span>
                <span className="name" role="cell">
                  {entry?.name}
                </span>
                <span className="score" role="cell">
                  {entry?.score}
                </span>
              </div>
            );
          })}
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

/** "Enter your high score": the name for a new entry, the last one entered by default. */
export function NewHighScore(props: { name: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.name);
  return (
    <Dialog
      title="Enter your high score"
      className="card-new-high-score"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => props.onOk(name.trim()) }]}
    >
      <div className="ribbons">
        <img src={blueRibbon} alt="" width={68} height={100} />
        <div>
          <p className="congratulations">Congratulations!</p>
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
            value={name}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <img src={redRibbon} alt="" width={68} height={100} />
      </div>
    </Dialog>
  );
}
