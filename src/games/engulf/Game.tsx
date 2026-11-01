import { useEffect, useRef, useState } from 'react';
import layouts from '../../assets/engulf/layouts.json';
import type { GameProps } from '../index.ts';
import { gameById } from '../../shell/catalog.ts';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { msvcRand } from '../reversi/logic.ts';
import { animate, type Point } from '../reversi/shared/animate.ts';
import { CONFIRM_NEW, ConfirmBox, MessageBox } from '../reversi/shared/Boxes.tsx';
import { EndDialog, type Outcome } from '../reversi/shared/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../reversi/shared/HelpDialogs.tsx';
import '../reversi/shared/style.css';
import { pause, useTurns } from '../reversi/shared/turns.ts';
import { scoreInBackground } from './ai.ts';
import { Board } from './Board.tsx';
import { pieceAt } from './layout.ts';
import {
  captures,
  chooseMove,
  COMPUTER,
  count,
  EMPTY,
  hasMove,
  moves,
  play,
  PLAYER,
  startBoard,
  type Board as Squares,
  type Move,
  type Rand,
  type Side,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { nextLayout, startingBoardFor } from './progress.ts';
import { loadEngulfSettings, saveEngulfSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('engulf')!;
const TITLE = 'Engulf';

/** Dialogs that a running turn waits for. */
type Pending = { kind: 'pass'; side: Side } | { kind: 'end'; outcome: Outcome; lines: [string, string] };
type Modal = { kind: 'options' | 'rules' | 'about' | 'new' } | (Pending & { resolve: () => void });

const END_SOUND: Record<Outcome, SoundEvent> = { lose: 'Defeat', win: 'Victory', tie: 'Tie' };

export default function Engulf({ onExit }: GameProps) {
  // The first game's layout, and rand(), seeded with the time like the original's srand(time()).
  const [initial] = useState(() => {
    const random = msvcRand(Date.now());
    const s = loadEngulfSettings();
    const layout = nextLayout(s.startingBoard, s.progression, random);
    // Stored so that the next visit continues from this layout.
    return { settings: { ...s, startingBoard: startingBoardFor(layout, s.progression) }, layout, random };
  });
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [layout, setLayout] = useState(initial.layout);
  const seeded = useRef<Rand>(initial.random);
  const rand = () => seeded.current();
  // What the board shows, animations included; `current.board` is the position.
  const [squares, setSquares] = useState<Squares>(() => startBoard(layouts[layout]!));
  // A game in progress (the original's flag at 0x229).
  const [active, setActive] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState<{ side: Side; at: Point } | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const { busy, run, stop } = useTurns();

  const current = useRef({ settings, board: squares });
  useEffect(() => {
    current.current.settings = settings;
  });

  useEffect(() => saveEngulfSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const { soundEnabled, sounds } = current.current.settings;
    const name = sounds[event];
    if (soundEnabled && name) playSound(name);
  };

  const ask = (m: Pending) => new Promise<void>((resolve) => setModal({ ...m, resolve }));

  const slide = (side: Side, from: Point, to: Point, signal: AbortSignal) =>
    animate(from, to, current.current.settings.animation, (p) => setMoving({ side, at: p }), signal);

  /**
   * A move as the window shows it (`FUN_00402fc0`): the piece slides to its square (unless the
   * player dragged it there), a copy slides back to the square it left, then each captured
   * piece is taken by one sliding out from the new piece.
   */
  const show = async (side: Side, move: Move, slideIn: boolean, alive: () => void, signal: AbortSignal) => {
    const before = current.current.board;
    const view = [...before];
    view[move.from] = EMPTY;
    setSquares([...view]);
    if (slideIn) await slide(side, pieceAt(move.from), pieceAt(move.to), signal);
    alive();
    view[move.to] = side;
    setMoving(null);
    setSquares([...view]);
    if (!move.jump) {
      await slide(side, pieceAt(move.to), pieceAt(move.from), signal);
      alive();
      view[move.from] = side;
      setMoving(null);
      setSquares([...view]);
    }
    for (const c of captures(before, move.to, side)) {
      sound('Piece Capture');
      await slide(side, pieceAt(move.to), pieceAt(c), signal);
      alive();
      view[c] = side;
      setMoving(null);
      setSquares([...view]);
    }
    current.current.board = play(before, move, side);
    setSquares(current.current.board);
  };

  /** The computer thinks (an hourglass), then moves. */
  const computerTurn = async (alive: () => void, signal: AbortSignal) => {
    setThinking(true);
    await pause();
    const scored = await scoreInBackground(current.current.board, current.current.settings.skill);
    alive();
    setThinking(false);
    const move = chooseMove(scored, rand);
    if (!move) return;
    sound('Enemy Piece Move');
    await show(COMPUTER, move, true, alive, signal);
  };

  /** The end (`FUN_00402b80`): the scores, or the computer resigning, a sound and the dialog. */
  const gameOver = async (resign: boolean) => {
    const board = current.current.board;
    const yours = count(board, PLAYER);
    const mine = count(board, COMPUTER);
    setActive(false);
    const you = `Your Score : ${yours}`;
    const me = `My Score : ${mine}`;
    const outcome: Outcome = resign ? 'win' : yours < mine ? 'lose' : yours > mine ? 'win' : 'tie';
    const lines: [string, string] = resign
      ? ['Computer resigns', 'after 5 moves']
      : outcome === 'lose'
        ? [me, you]
        : [you, me];
    sound(END_SOUND[outcome]);
    await ask({ kind: 'end', outcome, lines });
  };

  /** After the player's move (`FUN_00402580`): passes, the computer's moves, the end. */
  const afterPlayer = async (alive: () => void, signal: AbortSignal) => {
    const board = () => current.current.board;
    const counts = () => [count(board(), PLAYER), count(board(), COMPUTER)] as const;
    if (!hasMove(board(), COMPUTER)) {
      const [yours, mine] = counts();
      if (!hasMove(board(), PLAYER) || mine < yours) return gameOver(false);
      return ask({ kind: 'pass', side: COMPUTER });
    }
    for (let n = 0; ; n++) {
      await computerTurn(alive, signal);
      // The fifth computer move in a row (the player passing): it resigns.
      if (n >= 4) return gameOver(true);
      const player = hasMove(board(), PLAYER);
      const computer = hasMove(board(), COMPUTER);
      if (!player && !computer) return gameOver(false);
      if (player) return;
      const [yours, mine] = counts();
      if (yours < mine) return gameOver(false);
      await ask({ kind: 'pass', side: PLAYER });
      alive();
    }
  };

  /** Game › New, and every restart (`FUN_00401b30`): the next layout; the computer may move first. */
  const newGame = (s: Settings = current.current.settings) => {
    stop();
    const next = nextLayout(s.startingBoard, s.progression, rand);
    setLayout(next);
    setSettings({ ...s, startingBoard: startingBoardFor(next, s.progression) });
    current.current.board = startBoard(layouts[next]!);
    setSquares(current.current.board);
    setMoving(null);
    setThinking(false);
    setActive(true);
    if (!s.playerFirst) run(computerTurn);
  };

  useEffect(() => {
    sound('Engulf Start');
    if (!current.current.settings.playerFirst) run(computerTurn);
    // Once, when the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerMoves = active && !busy && !modal ? moves(squares, PLAYER) : [];

  const askNew = () => (active ? setModal({ kind: 'new' }) : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || modal) return;
      e.preventDefault();
      askNew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exit = () => {
    sound('Engulf Exit');
    onExit();
  };

  const close = () => setModal(null);
  const resolve = () => {
    if (modal && 'resolve' in modal) modal.resolve();
    setModal(null);
  };

  return (
    <Window
      title={`${TITLE} - Board ${layout + 1}`}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game engulf board-game"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { separator: true },
            { label: '~Options...', onSelect: () => setModal({ kind: 'options' }) },
            { separator: true },
            { label: 'E~xit', shortcut: 'Alt+F4', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setModal({ kind: 'rules' }) },
            { label: `~About ${TITLE}...`, onSelect: () => setModal({ kind: 'about' }) },
          ],
        },
      ]}
    >
      <Board
        squares={squares}
        background={settings.background}
        board={settings.board}
        pieceSet={settings.pieceSet}
        moving={moving}
        thinking={thinking}
        moves={playerMoves}
        dragBitmaps={settings.dragBitmaps}
        showDragZones={settings.showDragZones}
        showDropZones={settings.showDropZones}
        onPickUp={() => sound('Piece Drag')}
        onMiss={beep}
        onDrop={(move) => {
          sound('Piece Drop');
          run(async (alive, signal) => {
            await show(PLAYER, move, !settings.dragBitmaps, alive, signal);
            await afterPlayer(alive, signal);
          });
        }}
      />

      {modal?.kind === 'options' && (
        <OptionsDialog
          settings={settings}
          layout={layout}
          inProgress={active}
          onCancel={close}
          onOk={(next) => {
            setSettings(next);
            current.current.settings = next;
            setModal(null);
            newGame(next);
          }}
        />
      )}

      {modal?.kind === 'new' && (
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_NEW}
          onYes={() => {
            setModal(null);
            newGame();
          }}
          onNo={close}
        />
      )}

      {modal?.kind === 'pass' && (
        <MessageBox
          title={TITLE}
          text={modal.side === COMPUTER ? "I must pass.  It's your turn again." : "You must pass.  It's my move again."}
          onOk={resolve}
        />
      )}

      {modal?.kind === 'end' && (
        <EndDialog title={TITLE} outcome={modal.outcome} lines={modal.lines} onClose={resolve} />
      )}

      {modal?.kind === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          controls="Press on one of your pieces and drag it (with the mouse or a finger) to an empty square one or two away; F2 starts a new game."
          onClose={close}
        />
      )}

      {modal?.kind === 'about' && <AboutDialog title={TITLE} onClose={close} />}
    </Window>
  );
}
