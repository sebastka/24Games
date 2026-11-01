// The Hall of Fame of CZGAME32.DLL (dialogs 3000 and 3001): the table over the chequered
// flag, and the "Congratulations!" dialog asking for a name between two ribbons.
import { useEffect, useRef, useState } from 'react';
import blueRibbon from '../../assets/shared/czgame/blue_ri2.png';
import flag from '../../assets/shared/czgame/flag2.png';
import redRibbon from '../../assets/shared/czgame/red_rib2.png';
import { Dialog } from '../../shell/Dialog.tsx';
import { maskedSprite } from '../wari/czgame.ts';
import { TABLE_SIZE, type Entry } from './logic.ts';

/** A picture whose mask is on its right half (white = transparent). */
function Masked({ src, width, height, className }: { src: string; width: number; height: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(maskedSprite(img, 0, 0, width, height, width, 0), 0, 0);
    };
    img.src = src;
  }, [src, width, height]);
  return <canvas ref={canvas} width={width} height={height} className={className} aria-hidden="true" />;
}

/**
 * Game › Show High Scores (dialog 3000): ten places, each a number, a name and a score, going
 * down the flag; Clear Scores asks first (message 3000).
 */
export function HallOfFame(props: { title: string; table: Entry[]; onClear: () => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        title={props.title}
        className="hall-of-fame"
        buttons={[
          { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
          { label: 'Clear Scores', onClick: () => setConfirm(true) },
        ]}
      >
        <div className="hall">
          <Masked src={flag} width={351} height={302} className="flag" />
          {Array.from({ length: TABLE_SIZE }, (_, i) => (
            <div key={i} className="place" style={{ left: 11 * i, top: 27 * i }}>
              <span className="rank">{i + 1}</span>
              <span className="name">{props.table[i]?.name ?? ''}</span>
              <span className="score">{props.table[i]?.score ?? ''}</span>
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

/** The name of a new high score (dialog 3001), the last name entered proposed. */
export function EnterName(props: { name: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.name);
  return (
    <Dialog
      title="Enter your high score"
      className="enter-name"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => props.onOk(name) }]}
    >
      <div className="congratulations">
        <Masked src={blueRibbon} width={68} height={100} />
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
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <Masked src={redRibbon} width={68} height={100} />
      </div>
    </Dialog>
  );
}
