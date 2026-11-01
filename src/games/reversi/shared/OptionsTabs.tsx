// The parts of the board games' Options dialogs that the CZGAME32.DLL framework provides: skill
// level, Board and Pieces tabs (a list and a preview, `FUN_00405010`), the Animation tab.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useImage } from '../../../shell/canvas.ts';
import { ListBox } from '../../../shell/Dialog.tsx';
import { Label } from '../../../shell/Window.tsx';
import { BOARD_SHEET, BOARDS, PIECE, PIECE_SETS, PIECE_SHEETS, SQUARE } from './assets.ts';
import { usePieces } from './sprites.ts';

const SKILLS = ['Ea~sy', '~Moderate', '~Difficult', 'E~xpert'];

/** The "Skill Level" radio buttons (1 Easy … 4 Expert). */
export function SkillLevel({ value, onChange }: { value: number; onChange: (skill: number) => void }) {
  return (
    <fieldset className="skill">
      <legend>Skill Level</legend>
      {SKILLS.map((label, i) => (
        <label key={label} className="check">
          <input type="radio" name="skill" checked={value === i + 1} onChange={() => onChange(i + 1)} />
          <span>
            <Label text={label} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A group box around a drop-down list ("Who Goes First", "Start Position"…). */
export function Choice(props: { legend: string; items: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <fieldset className="choice">
      <legend>{props.legend}</legend>
      <select aria-label={props.legend} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))}>
        {props.items.map((item, i) => (
          <option key={item} value={i}>
            {item}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

/** An 80×80 preview, redrawn on every render (it is small). */
function Preview({ draw }: { draw: (ctx: CanvasRenderingContext2D) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 80, 80);
    draw(ctx);
  });
  return <canvas ref={canvas} width={80} height={80} className="preview" aria-hidden="true" />;
}

/** Options › Board: the board names, and a preview of its two squares (`FUN_00409700`). */
export function BoardTab({ value, onChange }: { value: number; onChange: (board: number) => void }) {
  const sheet = useImage(BOARD_SHEET);
  return (
    <div className="pieces">
      <fieldset>
        <legend>Board Names</legend>
        <ListBox label="Boards" items={BOARDS} selected={value} onSelect={onChange} rows={6} />
      </fieldset>
      <fieldset>
        <legend>Board Preview</legend>
        <Preview
          draw={(ctx) => {
            if (!sheet) return;
            const x = value * 2 * SQUARE;
            ctx.drawImage(sheet, x, 0, 2 * SQUARE, SQUARE, 0, 0, 2 * SQUARE, SQUARE);
            ctx.drawImage(sheet, x + SQUARE, 0, SQUARE, SQUARE, 0, SQUARE, SQUARE, SQUARE);
            ctx.drawImage(sheet, x, 0, SQUARE, SQUARE, SQUARE, SQUARE, SQUARE, SQUARE);
          }}
        />
      </fieldset>
    </div>
  );
}

/**
 * Options › Pieces: the piece set names, and a preview of four pieces (`FUN_00408a20`): both
 * sides, crossed, or (`twoSides` false) the first side's piece only on the diagonal.
 */
export function PiecesTab(props: { value: number; onChange: (set: number) => void; twoSides?: boolean }) {
  const pieces = usePieces(PIECE_SHEETS[props.value]!);
  const other = props.twoSides === false ? 0 : PIECE;
  return (
    <div className="pieces">
      <fieldset>
        <legend>Piece Names</legend>
        <ListBox label="Piece sets" items={PIECE_SETS} selected={props.value} onSelect={props.onChange} rows={6} />
      </fieldset>
      <fieldset>
        <legend>Piece Preview</legend>
        <Preview
          draw={(ctx) => {
            if (!pieces) return;
            const at = (sx: number, x: number, y: number) =>
              ctx.drawImage(pieces, sx, 0, PIECE, PIECE, 4 + x, 4 + y, PIECE, PIECE);
            at(0, 0, 0);
            at(other, 36, 0);
            at(other, 0, 36);
            at(0, 36, 36);
          }}
        />
      </fieldset>
    </div>
  );
}

/**
 * Options › Animation: "Animation Enabled" and a Slow…Fast slider (1-15). The speed is 0 when
 * animation is disabled; the slider then keeps its last position (7 at first). `extra`: more
 * group boxes beside it (Engulf's "Mouse Dragging").
 */
export function AnimationTab(props: { value: number; onChange: (speed: number) => void; extra?: ReactNode }) {
  const { value, onChange } = props;
  const [speed, setSpeed] = useState(value || 7);
  const enabled = value > 0;
  return (
    <div className="animation">
      <fieldset>
        <legend>Animation</legend>
        <label className="check">
          <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked ? speed : 0)} />
          <span>
            <Label text="A~nimation Enabled" />
          </span>
        </label>
        <div className={enabled ? 'speed' : 'speed disabled'}>
          <span className="title">Animation Speed</span>
          <input
            type="range"
            min={1}
            max={15}
            value={speed}
            disabled={!enabled}
            aria-label="Animation speed"
            onChange={(e) => {
              setSpeed(Number(e.target.value));
              onChange(Number(e.target.value));
            }}
          />
          <span className="ends">
            <span>Slow</span>
            <span>Fast</span>
          </span>
        </div>
      </fieldset>
      {props.extra}
    </div>
  );
}
