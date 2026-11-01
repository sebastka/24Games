// Dialogs the games share, from CZGAME32.DLL: the "You Win!" / "You Lose!" / "It's a Tie!" box
// (dialogs 1002-1004) and the high scores (3000: the Hall of Fame, 3001: Enter your high score).
import { useState } from 'react';
import blueRibbon from '../../assets/shared/czgame/blue_ri2.png';
import flag from '../../assets/shared/czgame/flag2.png';
import iWin from '../../assets/shared/czgame/iwin2.png';
import redRibbon from '../../assets/shared/czgame/red_rib2.png';
import tie from '../../assets/shared/czgame/tie2.png';
import youWin from '../../assets/shared/czgame/youwin2.png';
import { Dialog } from '../../shell/Dialog.tsx';
import { TABLE_SIZE, type Entry } from './hallOfFame.ts';
import { useMasked } from './sprites.ts';
import './dialogs.css';

const OUTCOME = {
  win: { heading: 'You Win!', picture: youWin },
  lose: { heading: 'You Lose!', picture: iWin },
  tie: { heading: "It's A Tie!", picture: tie },
};

/**
 * The end of a game (`FUN_004067a0`): a heading, a line or two of text and a picture: a thumb up
 * on the right when the player wins; a thumb down (the computer wins, or the player gave up) or a
 * handshake (a tie) on the left. Untitled.
 */
export function OutcomeDialog(props: { outcome: keyof typeof OUTCOME; lines: string[]; onOk: () => void }) {
  const { heading, picture } = OUTCOME[props.outcome];
  const src = useMasked(picture, 'right');
  return (
    <Dialog
      title=""
      className="cz-outcome"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <div className={`outcome-body ${props.outcome}`}>
        <div className="outcome-text">
          <p className="heading">{heading}</p>
          {props.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="outcome-picture">{src && <img src={src} alt="" width={120} height={200} />}</div>
      </div>
    </Dialog>
  );
}

/** Game › Show High Scores (`FUN_00408220`): ten places down a chequered flag. */
export function HallOfFameDialog(props: {
  title: string;
  table: readonly Entry[];
  onClear: () => void;
  onClose: () => void;
}) {
  const src = useMasked(flag, 'right');
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        title={props.title}
        className="cz-hall-of-fame"
        buttons={[
          { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
          { label: 'Clear Scores', onClick: () => setConfirm(true) },
        ]}
      >
        <div className="flag">
          {src && <img src={src} alt="" width={351} height={302} />}
          {Array.from({ length: TABLE_SIZE }, (_, i) => {
            const entry = props.table[i];
            // Each place 11 pixels right of and 27 below the one above (FUN_00408f30).
            const style = { left: 11 + 11 * i, top: 10 + 27 * i };
            return (
              <div key={i} className="place" style={style}>
                <span className="rank">{i + 1}</span>
                <span className="name">{entry?.name}</span>
                <span className="score">{entry?.score}</span>
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

/** Enter your high score (`FUN_00409170`): the name, offered as the last one entered. */
export function HighScoreDialog(props: { name: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.name);
  const blue = useMasked(blueRibbon, 'right');
  const red = useMasked(redRibbon, 'right');
  return (
    <Dialog
      title="Enter your high score"
      className="cz-high-score"
      buttons={[{ label: 'OK', primary: true, onClick: () => props.onOk(name) }]}
    >
      <div className="ribbons">
        {blue && <img src={blue} alt="" width={68} height={100} />}
        <div>
          <p className="heading">Congratulations!</p>
          <p>
            You have a high score.
            <br />
            Please enter your name
          </p>
          <input
            type="text"
            className="name"
            aria-label="Your name"
            maxLength={40}
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
