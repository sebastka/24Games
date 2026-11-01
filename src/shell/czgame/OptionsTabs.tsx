// The parts of the board games' Options dialogs that the CZGAME32.DLL framework provides: the
// skill level, the Board and Pieces tabs (a list and a preview, `FUN_00405010`), the Animation
// tab (speed, and "Mouse Dragging" for the games that drag pieces).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useImage } from '../canvas.ts';
import { ListBox } from '../Dialog.tsx';
import { Label } from '../Window.tsx';
import { DEFAULT_SPEED } from './animate.ts';
import { BOARD_SHEET, BOARDS, drawSquare, PIECE, PIECE_SETS, SQUARE, usePieces } from './pieces.ts';
import './style.css';

const SKILLS = ['Ea~sy', '~Moderate', '~Difficult', 'E~xpert'];

/** The "Skill Level" radio buttons (1 Easy … 4 Expert; `levels` 3 for the games without Expert). */
export function SkillLevel(props: { value: number; onChange: (skill: number) => void; levels?: number }) {
  return (
    <fieldset className="skill">
      <legend>Skill Level</legend>
      {SKILLS.slice(0, props.levels ?? 4).map((label, i) => (
        <label key={label} className="check">
          <input type="radio" name="skill" checked={props.value === i + 1} onChange={() => props.onChange(i + 1)} />
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

/** A tab of a list of names and a preview of the one selected (Board, Pieces, a game's layouts…). */
export function ListTab(props: {
  legend: string;
  items: string[];
  value: number;
  onChange: (i: number) => void;
  previewLegend: string;
  preview: ReactNode;
}) {
  return (
    <div className="pieces list-tab">
      <fieldset>
        <legend>{props.legend}</legend>
        <ListBox label={props.legend} items={props.items} selected={props.value} onSelect={props.onChange} rows={7} />
      </fieldset>
      <fieldset>
        <legend>{props.previewLegend}</legend>
        {props.preview}
      </fieldset>
    </div>
  );
}

/** An 80×80 preview, redrawn on every render (it is small). */
export function Preview({ draw, label }: { draw: (ctx: CanvasRenderingContext2D) => void; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 80, 80);
    draw(ctx);
  });
  return <canvas ref={canvas} width={80} height={80} className="preview" role="img" aria-label={label} />;
}

/** Board Preview (`FUN_00409700`): the board's two squares, chequered. */
export function BoardPreview({ board }: { board: number }) {
  const sheet = useImage(BOARD_SHEET);
  return (
    <Preview
      label={`${BOARDS[board]} board`}
      draw={(ctx) => {
        if (!sheet) return;
        for (let i = 0; i < 4; i++) {
          const [x, y] = [i % 2, Math.floor(i / 2)];
          drawSquare(ctx, sheet, board, (x + y) % 2, x * SQUARE, y * SQUARE);
        }
      }}
    />
  );
}

/**
 * Piece Preview (`FUN_00408a20`): four pieces, both sides crossed, or (`twoSides` false) the first
 * side's piece only.
 */
export function PiecePreview({ pieceSet, twoSides = true }: { pieceSet: number; twoSides?: boolean }) {
  const pieces = usePieces(pieceSet);
  return (
    <Preview
      label={`${PIECE_SETS[pieceSet]} pieces`}
      draw={(ctx) => {
        if (!pieces) return;
        const [first, second] = twoSides ? pieces : [pieces[0], pieces[0]];
        for (const [piece, x, y] of [
          [first, 0, 0],
          [second, 36, 0],
          [second, 0, 36],
          [first, 36, 36],
        ] as const) {
          ctx.drawImage(piece, 4 + x, 4 + y, PIECE, PIECE);
        }
      }}
    />
  );
}

/** Options › Board: the board names and the preview. */
export function BoardTab({ value, onChange }: { value: number; onChange: (board: number) => void }) {
  return (
    <ListTab
      legend="Board Names"
      items={BOARDS}
      value={value}
      onChange={onChange}
      previewLegend="Board Preview"
      preview={<BoardPreview board={value} />}
    />
  );
}

/** Options › Pieces: the piece set names and the preview. */
export function PiecesTab(props: { value: number; onChange: (set: number) => void; twoSides?: boolean }) {
  return (
    <ListTab
      legend="Piece Names"
      items={PIECE_SETS}
      value={props.value}
      onChange={props.onChange}
      previewLegend="Piece Preview"
      preview={<PiecePreview pieceSet={props.value} twoSides={props.twoSides} />}
    />
  );
}

/**
 * Options › Animation: "Animation Enabled" and a Slow…Fast slider (1-15). The speed is 0 when
 * animation is disabled; the slider then keeps its last position (7 at first). `children`: more
 * group boxes beside it (the games' "Mouse Dragging").
 */
export function AnimationTab(props: { value: number; onChange: (speed: number) => void; children?: ReactNode }) {
  const { value, onChange } = props;
  const [speed, setSpeed] = useState(value || DEFAULT_SPEED);
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
      {props.children}
    </div>
  );
}

/** The Mouse Dragging options of the games that drag pieces or cards. */
export interface Dragging {
  /** Drag the piece itself (the registry's DragBitmaps), else its outline. */
  drag: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
}

const PIECE_LABELS = ['~Drag Pieces', 'D~rag Outlines', '~Show Drag Zones', 'S~how Drop Zones'];

/** The Balloon Help of the four controls (pegoplis.exe strings). */
const TIPS = [
  'If this radio button is selected, mouse dragging will drag the actual pieces on the board.',
  'If this radio button is selected, mouse dragging will not drag the playing piece itself. Rather it will drag an outline of the piece.  This is better for slower systems.',
  'If this box is checked, the pieces that are available for mouse-dragging will flash when the mouse is moved over them. This is good when you are just learning how to play.',
  'If this box is checked, the available locations where a piece can be dropped will flash when dragged over. This is good when you are just learning how to play.',
];

/**
 * The "Mouse Dragging" group (the drag-and-drop games' Animation tab, or beside the speed):
 * dragging the piece or its outline, and the flashing drag and drop zones. `labels`: the card
 * games' ("Drag Cards"…).
 */
export function MouseDragging(props: { value: Dragging; onChange: (value: Dragging) => void; labels?: string[] }) {
  const { value, onChange } = props;
  const labels = props.labels ?? PIECE_LABELS;
  const tip = (i: number) => (props.labels ? undefined : TIPS[i]);
  const text = (i: number) => (
    <span>
      <Label text={labels[i]!} />
    </span>
  );
  return (
    <fieldset className="mouse-dragging">
      <legend>Mouse Dragging</legend>
      <label className="check" title={tip(0)}>
        <input type="radio" name="drag" checked={value.drag} onChange={() => onChange({ ...value, drag: true })} />
        {text(0)}
      </label>
      <label className="check" title={tip(1)}>
        <input type="radio" name="drag" checked={!value.drag} onChange={() => onChange({ ...value, drag: false })} />
        {text(1)}
      </label>
      <label className="check zones" title={tip(2)}>
        <input
          type="checkbox"
          checked={value.showDragZones}
          onChange={(e) => onChange({ ...value, showDragZones: e.target.checked })}
        />
        {text(2)}
      </label>
      <label className="check" title={tip(3)}>
        <input
          type="checkbox"
          checked={value.showDropZones}
          onChange={(e) => onChange({ ...value, showDropZones: e.target.checked })}
        />
        {text(3)}
      </label>
    </fieldset>
  );
}

/** Options › Animation of the games that only drag (Pegopolis, Black Box Chess, the card games). */
export function DraggingTab(props: { value: Dragging; onChange: (value: Dragging) => void; labels?: string[] }) {
  return (
    <div className="animation">
      <MouseDragging {...props} />
    </div>
  );
}
