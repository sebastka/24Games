// The high score dialogs of CZGAME32.DLL, shared by every game with a Hall of Fame: dialog 3000,
// the table over the chequered flag, and 3001, "Enter your high score" between two ribbons.
import { useState } from 'react';
import blueRibbon from '../assets/shared/czgame/blue_ri2.png';
import flag from '../assets/shared/czgame/flag2.png';
import redRibbon from '../assets/shared/czgame/red_rib2.png';
import { ConfirmBox } from './Boxes.tsx';
import { Dialog, DialogButtons } from './Dialog.tsx';
import { TABLE_SIZE, type Table } from './highscores.ts';
import { MaskedSprite } from './MaskedSprite.tsx';
import './hall-of-fame.css';

/**
 * Show High Scores (dialog 3000, painted by FUN_0040dd80 in cheesy.exe, FUN_00408f30 in
 * match.exe): the flag (flag2.bmp, 351×302 at (4, 10)), then ten rows of white boxes (rank 18,
 * name 160 and score 60 pixels wide, 18 high, 4 apart), row i at (10 + 11i, 10 + 27i); OK and
 * Clear Scores over the flag's foot. Clear Scores asks first (message 3000), and is greyed out
 * without `onClear` (tables shared by everyone on the instance). `title`: "Hall of Fame", or the
 * table's name when a game has several ("Hall of Fame - Easy").
 */
export function HallOfFame(props: { title: string; table: Table; onClear?: () => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const { onClear } = props;
  const buttons = [
    { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
    { label: 'Clear Scores', disabled: !onClear, onClick: () => setConfirm(true) },
  ];
  return (
    <>
      <Dialog title={props.title} className="hall-of-fame" buttons={buttons} noFooter>
        <div className="flag" role="table" aria-label={props.title}>
          <MaskedSprite src={flag} width={351} height={302} className="picture" />
          {Array.from({ length: TABLE_SIZE }, (_, i) => (
            <div key={i} className="row" role="row" style={{ left: 10 + 11 * i, top: 10 + 27 * i }}>
              <span className="rank" role="cell">
                {i + 1}
              </span>
              <span className="name" role="cell">
                {props.table[i]?.name}
              </span>
              <span className="score" role="cell">
                {props.table[i]?.score}
              </span>
            </div>
          ))}
          <DialogButtons buttons={buttons} className="buttons" />
        </div>
      </Dialog>
      {confirm && (
        <ConfirmBox
          title={props.title}
          text="Are you sure you want to clear the scores in the high score table?"
          onYes={() => {
            setConfirm(false);
            onClear?.();
          }}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}

/**
 * After a game with a high score (dialog 3001, FUN_00409170 in match.exe): "Congratulations!"
 * between the blue and red ribbons, and the name, the last one entered offered (selected).
 */
export function NewHighScore(props: { name: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.name);
  return (
    <Dialog
      title="Enter your high score"
      className="new-high-score"
      buttons={[{ label: 'OK', primary: true, onClick: () => props.onOk(name.trim()) }]}
    >
      <div className="ribbons">
        <MaskedSprite src={blueRibbon} width={68} height={100} />
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
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <MaskedSprite src={redRibbon} width={68} height={100} />
      </div>
    </Dialog>
  );
}
