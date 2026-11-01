import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { backgroundStyle, useFitScale, useImage } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { animate, type Point } from '../../shell/czgame/animate.ts';
import { BOARD_SHEET, drawSquare, usePieces } from '../../shell/czgame/pieces.ts';
import { EndDialog, type Outcome } from '../../shell/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import {
  computerMove,
  computerPlacement,
  draggable,
  isFirstStretch,
  moveComputer,
  movePlayer,
  PATH,
  placeComputer,
  playerCanMove,
  start,
  targets,
  type State,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('winding')!;

// Window 520×400 (winding.exe's window resource): a board of 13×10 squares of 40 pixels at
// (0, 0) of which only the path is drawn; the store in the middle (`FUN_0040c810`).
const WIDTH = 520;
const HEIGHT = 400;
const SQUARE = 40;
/** How often the drag and drop zones flash (ms). */
const FLASH_MS = 250;

const squareAt = (i: number): Point => ({ x: PATH[i]![0] * SQUARE, y: PATH[i]![1] * SQUARE });
/** A piece's place in the store: the player's on the upper row, the computer's on the lower. */
const storeAt = (side: 0 | 1, k: number): Point => ({ x: 204 + k * SQUARE, y: 164 + side * SQUARE });
const pieceAt = (side: 0 | 1, k: number, square: number): Point =>
  square < 0 ? storeAt(side, k) : { x: squareAt(square).x + 4, y: squareAt(square).y + 4 };

const squareUnder = (x: number, y: number): number =>
  PATH.findIndex(([c, r]) => x >= c * SQUARE && x < (c + 1) * SQUARE && y >= r * SQUARE && y < (r + 1) * SQUARE);

interface Drag {
  piece: number;
  /** Where the pointer grabbed the piece, from its corner. */
  offset: Point;
  at: Point;
  targets: number[];
}

interface View {
  state: State;
  /** Pieces drawn somewhere else than their square: while they move (side, index → point). */
  moving: Map<string, Point>;
  drag: Drag | null;
  /** The flashing piece (drag zones) or square (drop zones). */
  flashPiece: number;
  flashSquare: number;
}

function draw(
  ctx: CanvasRenderingContext2D,
  view: View,
  sheet: HTMLImageElement,
  board: number,
  pieces: [HTMLCanvasElement, HTMLCanvasElement],
  dragPieces: boolean,
  flashOn: boolean,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  PATH.forEach((_, i) => {
    const { x, y } = squareAt(i);
    drawSquare(ctx, sheet, board, isFirstStretch(i) ? 1 : 0, x, y);
  });
  const invert = (x: number, y: number, size: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    ctx.restore();
  };
  if (flashOn && view.flashSquare >= 0) invert(squareAt(view.flashSquare).x, squareAt(view.flashSquare).y, SQUARE);
  const { state, drag } = view;
  ([0, 1] as const).forEach((side) => {
    const squares = side === 0 ? state.player : state.computer;
    squares.forEach((square, k) => {
      if (side === 0 && drag?.piece === k && dragPieces) return;
      const p = view.moving.get(`${side}${k}`) ?? pieceAt(side, k, square);
      ctx.drawImage(pieces[side], p.x, p.y);
      if (side === 0 && flashOn && view.flashPiece === k) invert(p.x, p.y, 32);
    });
  });
  if (drag) {
    if (dragPieces) ctx.drawImage(pieces[0], drag.at.x, drag.at.y);
    else {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(drag.at.x + 0.5, drag.at.y + 0.5, 31, 31);
      ctx.restore();
    }
  }
}

export default function WindingStandoff({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [open, setOpen] = useState<'options' | 'rules' | 'about' | 'abandon' | null>(null);
  const [end, setEnd] = useState<{ outcome: Outcome; lines: [string, string] } | null>(null);
  // The game in progress (`0x189`): the player can drag pieces.
  const [inProgress, setInProgress] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const sheet = useImage(BOARD_SHEET);
  const pieces = usePieces(settings.pieceSet);
  const view = useRef<View>({ state: start(), moving: new Map(), drag: null, flashPiece: -1, flashSquare: -1 });
  const playing = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const flashOn = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  useEffect(() => saveSettings(settings), [settings]);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && sheet && pieces) {
      draw(ctx, view.current, sheet, settings.board, pieces, settings.dragPieces, flashOn.current);
    }
  }, [sheet, pieces, settings.board, settings.dragPieces]);
  useEffect(redraw, [redraw, scale]);
  const latestRedraw = useRef(redraw);
  useEffect(() => {
    latestRedraw.current = redraw;
  });
  const paint = () => latestRedraw.current();

  // The zones flash while something is to flash.
  useEffect(() => {
    const timer = setInterval(() => {
      const v = view.current;
      if (v.flashPiece < 0 && v.flashSquare < 0) return;
      flashOn.current = !flashOn.current;
      latestRedraw.current();
    }, FLASH_MS);
    return () => clearInterval(timer);
  }, []);

  const sound = (event: SoundEvent) => playEvent(settingsRef.current, event);

  /** A piece glides from `from` to `to` at the animation speed. */
  const slide = async (key: string, from: Point, to: Point, g: number) => {
    const speed = settingsRef.current.speed;
    if (speed <= 0) return;
    const v = view.current;
    v.moving.set(key, from);
    await animate(
      from,
      to,
      speed,
      (p) => (v.moving.set(key, p), paint()),
      () => generation.current !== g,
    );
    v.moving.delete(key);
  };

  const finish = (outcome: Outcome, lines: [string, string], event: SoundEvent) => {
    playing.current = false;
    setInProgress(false);
    sound(event);
    setEnd({ outcome, lines });
    paint();
  };

  /** The computer's turn (`FUN_0040da40`): a placement, or a move and the end checks. */
  const computerTurn = async (g: number) => {
    const v = view.current;
    const { playerFirst, skill } = settingsRef.current;
    if (v.state.computer.includes(-1)) {
      const k = v.state.computer.indexOf(-1);
      const square = computerPlacement(v.state, playerFirst, Math.random);
      sound('Enemy Move From Store');
      await slide(`1${k}`, storeAt(1, k), pieceAt(1, k, square), g);
      if (generation.current !== g) return;
      v.state = placeComputer(v.state, square);
      paint();
      return;
    }
    const move = computerMove(v.state, skill, Math.random);
    if (move === 'stuck') {
      finish('win', ['Computer can', 'no longer move.'], 'Victory');
      return;
    }
    if (move === 'resign') {
      finish('win', ['Computer', 'Resigns.'], 'Victory');
      return;
    }
    const k = v.state.computer.indexOf(move.from);
    sound('Enemy Piece Move');
    await slide(`1${k}`, pieceAt(1, k, move.from), pieceAt(1, k, move.to), g);
    if (generation.current !== g) return;
    v.state = moveComputer(v.state, move.from, move.to);
    paint();
    if (!playerCanMove(v.state)) finish('lose', ['Player can', 'no longer move.'], 'Defeat');
  };

  const runComputer = async () => {
    busy.current = true;
    const g = generation.current;
    await computerTurn(g);
    if (generation.current === g) busy.current = false;
  };

  /** Game › New (`FUN_0040c810`). */
  const newGame = (s: Settings = settingsRef.current) => {
    settingsRef.current = s;
    generation.current++;
    busy.current = false;
    playing.current = true;
    view.current = { state: start(), moving: new Map(), drag: null, flashPiece: -1, flashSquare: -1 };
    setInProgress(true);
    setEnd(null);
    paint();
    if (!s.playerFirst) void runComputer();
  };

  const exit = useStartExit('Winding Standoff', settings, onExit);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    newGame();
  });
  const askNewGame = () => (inProgress ? setOpen('abandon') : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || end || e.key !== 'F2') return;
      e.preventDefault();
      askNewGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * WIDTH) / rect.width, y: ((e.clientY - rect.top) * HEIGHT) / rect.height };
  };

  /** The player's piece that can be dragged under the pointer, or -1. */
  const pieceUnder = (p: Point): number => {
    if (!playing.current || busy.current) return -1;
    const { state } = view.current;
    return (
      draggable(state).find((k) => {
        const at = pieceAt(0, k, state.player[k]!);
        return p.x >= at.x && p.x < at.x + 32 && p.y >= at.y && p.y < at.y + 32;
      }) ?? -1
    );
  };

  /** Starts dragging a piece (`FUN_0040cda0`), with its sound. */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (open || end) return;
    const p = point(e);
    const piece = pieceUnder(p);
    if (piece < 0) return;
    const v = view.current;
    const from = v.state.player[piece]!;
    const at = pieceAt(0, piece, from);
    sound(from < 0 ? 'Piece Drag From Store' : 'Piece Drag');
    v.drag = {
      piece,
      offset: { x: p.x - at.x, y: p.y - at.y },
      at,
      targets: targets(v.state, piece, settingsRef.current.playerFirst),
    };
    v.flashPiece = -1;
    e.currentTarget.setPointerCapture(e.pointerId);
    paint();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    const p = point(e);
    const s = settingsRef.current;
    if (v.drag) {
      v.drag.at = { x: p.x - v.drag.offset.x, y: p.y - v.drag.offset.y };
      const square = squareUnder(p.x, p.y);
      v.flashSquare = s.showDropZones && v.drag.targets.includes(square) ? square : -1;
      paint();
      return;
    }
    const piece = pieceUnder(p);
    e.currentTarget.style.cursor = piece >= 0 ? 'pointer' : '';
    const flash = s.showDragZones ? piece : -1;
    if (flash !== v.flashPiece) {
      v.flashPiece = flash;
      paint();
    }
  };

  /** Drops the piece (`FUN_0040d6f0`), then the computer's turn; a wrong square beeps (`FUN_0040d970`). */
  const onPointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    const drag = v.drag;
    if (!drag) return;
    v.drag = null;
    v.flashSquare = -1;
    const p = point(e);
    const square = squareUnder(p.x, p.y);
    if (!drag.targets.includes(square)) {
      beep();
      paint();
      return;
    }
    busy.current = true;
    const g = generation.current;
    const target = pieceAt(0, drag.piece, square);
    // Dragging outlines, the piece itself glides to its square.
    if (!settingsRef.current.dragPieces) {
      await slide(`0${drag.piece}`, pieceAt(0, drag.piece, v.state.player[drag.piece]!), target, g);
      if (generation.current !== g) return;
    }
    v.state = movePlayer(v.state, drag.piece, square);
    paint();
    await computerTurn(g);
    if (generation.current === g) busy.current = false;
  };

  return (
    <Window
      title="Winding Standoff"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game winding"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNewGame },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: '~About Winding Standoff...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <div className="playfield" style={backgroundStyle(settings.background)}>
        <div className="board" ref={box}>
          <canvas
            ref={canvas}
            width={WIDTH}
            height={HEIGHT}
            style={{ width: WIDTH * scale, height: HEIGHT * scale }}
            aria-label="Winding Standoff board"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => void onPointerUp(e)}
            onPointerCancel={() => {
              view.current.drag = null;
              view.current.flashSquare = -1;
              paint();
            }}
          />
        </div>
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={inProgress}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            setSettings(next);
            setOpen(null);
            newGame(next);
          }}
        />
      )}

      {open === 'abandon' && (
        <ConfirmBox
          title="Winding Standoff"
          text={CONFIRM_NEW}
          onYes={() => {
            setOpen(null);
            newGame();
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Winding Standoff"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Drag your pieces with the mouse or a finger: from the middle of the board to your squares first, then along the path, any number of free squares."
        />
      )}

      {open === 'about' && <AboutDialog title="Winding Standoff" onClose={() => setOpen(null)} />}

      {end && <EndDialog title="Winding Standoff" outcome={end.outcome} lines={end.lines} onOk={() => setEnd(null)} />}
    </Window>
  );
}
