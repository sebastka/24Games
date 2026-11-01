// The high score dialogs of CZGAME32.DLL (StarView dialogs 3000 and 3001), shared by the arcade
// games: the Hall of Fame table, and the name entry after a high score.
import { useEffect, useRef, useState } from 'react';
import blueRibbon from '../../assets/shared/czgame/blue_ri2.png';
import flag from '../../assets/shared/czgame/flag2.png';
import redRibbon from '../../assets/shared/czgame/red_rib2.png';
import { useImage } from '../../shell/canvas.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import './hall-of-fame.css';
import type { HighScores } from './highscores.ts';

/**
 * Draws a CZGAME32 sprite whose mask is on its right half (white = transparent), as the games'
 * masked blit (FUN_00403680) does.
 */
export function MaskedSprite(props: { src: string; className?: string; alt?: string }) {
  const image = useImage(props.src);
  const canvas = useRef<HTMLCanvasElement>(null);
  const width = image ? image.width / 2 : 0;
  const height = image?.height ?? 0;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, width, 0, width, height, 0, 0, width, height);
    const mask = ctx.getImageData(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    const sprite = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < mask.data.length; i += 4) if (mask.data[i] === 255) sprite.data[i + 3] = 0;
    ctx.putImageData(sprite, 0, 0);
  }, [image, width, height]);
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      className={props.className}
      role={props.alt ? 'img' : undefined}
      aria-label={props.alt}
      aria-hidden={props.alt ? undefined : true}
    />
  );
}

/**
 * Game › Show High Scores (dialog 3000, FUN_00407510): the chequered flag, and ten rows of rank,
 * name and score in white boxes, each row 11 pixels further right than the one above.
 */
export function HallOfFameDialog(props: {
  scores: HighScores;
  /** "Hall of Fame", and the table's name when a game has several (Sechseck's board sizes). */
  title?: string;
  onClose: () => void;
  onClear: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog
        title={props.title ?? 'Hall of Fame'}
        className="hall-of-fame"
        buttons={[
          { label: 'OK', primary: true, cancel: true, onClick: props.onClose },
          { label: 'Clear Scores', onClick: () => setConfirm(true) },
        ]}
      >
        <div className="table">
          <MaskedSprite src={flag} className="flag" />
          <ol>
            {props.scores.entries.map((e, i) => (
              <li key={i} style={{ left: 10 + 11 * i, top: 10 + 27 * i }}>
                <span className="rank">{i + 1}</span>
                <span className="name">{e.name}</span>
                <span className="score">{e.score ?? ''}</span>
              </li>
            ))}
          </ol>
        </div>
      </Dialog>
      {confirm && (
        <Dialog
          title="Hall of Fame"
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

/** After a game with a high score (dialog 3001): the name for the table, the last one offered. */
export function NewHighScoreDialog(props: { player: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.player);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.select(), []);
  return (
    <Dialog
      title="Enter your high score"
      className="new-high-score"
      buttons={[{ label: 'OK', primary: true, onClick: () => props.onOk(name) }]}
    >
      <div className="ribbons">
        <MaskedSprite src={blueRibbon} />
        <div>
          <p className="congratulations">Congratulations!</p>
          <p>
            You have a high score.
            <br />
            Please enter your name
          </p>
        </div>
        <MaskedSprite src={redRibbon} />
      </div>
      <input
        ref={input}
        type="text"
        aria-label="Your name"
        autoComplete="nickname"
        spellCheck={false}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </Dialog>
  );
}
