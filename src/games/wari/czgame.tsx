// The dialogs and option tabs the board games (Wari, Nim, Push-Pull, Winding Standoff,
// Voracity) share through CZGAME32.DLL and their common framework code: the Pieces and
// Animation tabs, the skill level, the end-of-game dialogs with the hands. Helpers are in
// czgame.ts.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import iWin from '../../assets/shared/czgame/iwin2.png';
import tie from '../../assets/shared/czgame/tie2.png';
import youWin from '../../assets/shared/czgame/youwin2.png';
import { Dialog, ListBox } from '../../shell/Dialog.tsx';
import { Label } from '../../shell/Window.tsx';
import { useImage } from '../../shell/canvas.ts';
import {
  BOARD_NAMES,
  BOARD_SHEET,
  DEFAULT_SPEED,
  drawSquare,
  maskedSprite,
  PIECE_SET_NAMES,
  usePieces,
  type Outcome,
} from './czgame.ts';
import './czgame.css';

/** A canvas showing a sprite (for previews). */
function SpriteCanvas(props: { draw: (ctx: CanvasRenderingContext2D) => void; width: number; height: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { draw } = props;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, props.width, props.height);
    draw(ctx);
  });
  return <canvas ref={canvas} width={props.width} height={props.height} className="preview" />;
}

/**
 * Options › Pieces: the piece set list, and a preview of four pieces (`FUN_00408a20`): the
 * first piece twice on one diagonal, the second on the other in two-piece games.
 */
export function PiecesTab(props: { pieceSet: number; twoPieces: boolean; onChange: (pieceSet: number) => void }) {
  const pieces = usePieces(props.pieceSet);
  return (
    <div className="pieces">
      <fieldset>
        <legend>Piece Names</legend>
        <ListBox
          label="Piece names"
          items={PIECE_SET_NAMES}
          selected={props.pieceSet}
          onSelect={props.onChange}
          rows={7}
        />
      </fieldset>
      <fieldset className="piece-preview">
        <legend>Piece Preview</legend>
        <SpriteCanvas
          width={68}
          height={68}
          draw={(ctx) => {
            if (!pieces) return;
            const second = props.twoPieces ? pieces[1] : pieces[0];
            ctx.drawImage(pieces[0], 0, 0);
            ctx.drawImage(second, 36, 0);
            ctx.drawImage(second, 0, 36);
            ctx.drawImage(pieces[0], 36, 36);
          }}
        />
      </fieldset>
    </div>
  );
}

/** Options › Board: the board list, and a preview of four squares (as a checkerboard). */
export function BoardTab(props: { board: number; onChange: (board: number) => void }) {
  const sheet = useImage(BOARD_SHEET);
  return (
    <div className="pieces">
      <fieldset>
        <legend>Board Names</legend>
        <ListBox label="Board names" items={BOARD_NAMES} selected={props.board} onSelect={props.onChange} rows={7} />
      </fieldset>
      <fieldset className="piece-preview">
        <legend>Board Preview</legend>
        <SpriteCanvas
          width={80}
          height={80}
          draw={(ctx) => {
            if (!sheet) return;
            drawSquare(ctx, sheet, props.board, 0, 0, 0);
            drawSquare(ctx, sheet, props.board, 1, 40, 0);
            drawSquare(ctx, sheet, props.board, 1, 0, 40);
            drawSquare(ctx, sheet, props.board, 0, 40, 40);
          }}
        />
      </fieldset>
    </div>
  );
}

/** Options › Animation: "Animation Enabled", and the speed slider (1-15). */
export function AnimationTab(props: {
  speed: number;
  onChange: (speed: number) => void;
  /** A game's own animation options (Winding Standoff's Mouse Dragging). */
  children?: ReactNode;
}) {
  const [last, setLast] = useState(props.speed || DEFAULT_SPEED);
  const enabled = props.speed > 0;
  return (
    <div className="animation-tab">
      <fieldset>
        <legend>Animation</legend>
        <label className="check">
          <input type="checkbox" checked={enabled} onChange={(e) => props.onChange(e.target.checked ? last : 0)} />
          <span>
            <Label text="A~nimation Enabled" />
          </span>
        </label>
        <div className={`speed ${enabled ? '' : 'disabled'}`}>
          <span className="speed-title">Animation Speed</span>
          <input
            type="range"
            min={1}
            max={15}
            aria-label="Animation speed"
            disabled={!enabled}
            value={enabled ? props.speed : last}
            onChange={(e) => {
              setLast(Number(e.target.value));
              props.onChange(Number(e.target.value));
            }}
          />
          <span className="speed-ends">
            <span>Slow</span>
            <span>Fast</span>
          </span>
        </div>
      </fieldset>
      {props.children}
    </div>
  );
}

const HANDS: Record<Outcome, string> = { computer: iWin, player: youWin, tie };
const TITLES: Record<Outcome, string> = { computer: 'You Lose!', player: 'You Win!', tie: "It's A Tie!" };

/** The hand pictures are 120×200 with their mask on the right. */
function Hand({ outcome }: { outcome: Outcome }) {
  const [sprite, setSprite] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSprite(maskedSprite(img, 0, 0, 120, 200, 120, 0));
    img.src = HANDS[outcome];
  }, [outcome]);
  return (
    <SpriteCanvas
      width={120}
      height={200}
      draw={(ctx) => {
        if (sprite) ctx.drawImage(sprite, 0, 0);
      }}
    />
  );
}

/**
 * The end-of-game dialogs of CZGAME32.DLL (dialogs 1002-1004: "You Lose!", "You Win!",
 * "It's A Tie!"), without a title bar: the result, two lines (the scores), OK, and the hand.
 */
export function EndDialog(props: { outcome: Outcome; lines: [string, string]; onOk: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  const { onOk } = props;
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onOk();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onOk]);
  return (
    <div className="modal">
      <div className="window end-dialog" role="dialog" aria-modal="true" aria-label={TITLES[props.outcome]}>
        <div className="end-text">
          <p className="end-title">{TITLES[props.outcome]}</p>
          <p>{props.lines[0]}</p>
          <p>{props.lines[1]}</p>
          <button type="button" className="primary" ref={ok} onClick={onOk}>
            OK
          </button>
        </div>
        <div className="end-hand">
          <Hand outcome={props.outcome} />
        </div>
      </div>
    </div>
  );
}

/** The About dialog of the board games (as Bulldozer's). */
export function AboutText({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <p>{title} copyright © 1995 by The Code Zone.</p>
      {children}
      <p>
        From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software, Inc.
      </p>
      <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
    </>
  );
}

/** The skill levels (radio buttons 1-4 of the options' first tab). */
const SKILLS = ['Ea~sy', '~Moderate', '~Difficult', 'E~xpert'];

/** Skill Level radio buttons, as the board games share them. */
export function SkillLevel(props: { skill: number; onChange: (skill: number) => void }) {
  return (
    <fieldset className="skill-level">
      <legend>Skill Level</legend>
      {SKILLS.map((label, i) => (
        <label key={label} className="check">
          <input type="radio" name="skill" checked={props.skill === i + 1} onChange={() => props.onChange(i + 1)} />
          <span>
            <Label text={label} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A confirmation before OK when a game is in progress (`FUN_00403850`). */
export function ConfirmRestart(props: { title: string; onYes: () => void; onNo: () => void }) {
  return (
    <Dialog
      title={props.title}
      buttons={[
        { label: '~Yes', primary: true, onClick: props.onYes },
        { label: '~No', cancel: true, onClick: props.onNo },
      ]}
    >
      <p className="message warning">
        Changing the game options will restart the game in progress. Are you sure you want to do this?
      </p>
    </Dialog>
  );
}
