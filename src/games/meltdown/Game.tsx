import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../index.ts';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { gameById } from '../../shell/catalog.ts';
import { animate, type Point } from '../../shell/czgame/animate.ts';
import { PIECE, SQUARE } from '../../shell/czgame/pieces.ts';
import { pause, useTurns } from '../../shell/czgame/turns.ts';
import { EndDialog, type Outcome } from '../../shell/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { msvcRand, type Rand } from '../../shell/random.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { SIDE_PIECE, squareAt } from './layout.ts';
import {
  clickable,
  COMPUTER,
  computerMove,
  computerPlace,
  emptyBoard,
  PLAYER,
  playerPlace,
  totals,
  units,
  type Board as Squares,
  type Event,
  type Side,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadMeltdownSettings, saveMeltdownSettings, type Settings, type SoundEvent } from './settings.ts';
import '../../shell/czgame/style.css';
import './style.css';

const INFO = gameById('meltdown')!;
const TITLE = 'Core Meltdown';

type Modal =
  | { kind: 'options' | 'rules' | 'about' | 'new' }
  | { kind: 'end'; outcome: Outcome; lines: [string, string]; resolve: () => void };

/** The flying unit's size (`FUN_004024e0`): 12, 24, 32, 40 pixels for 1-4 units, else 12. */
const flyingSize = (u: number): number => [12, 12, 24, 32, 40][u] ?? 12;

export default function CoreMeltdown({ onExit }: GameProps) {
  const [settings, setSettings] = useState<Settings>(loadMeltdownSettings);
  const [squares, setSquares] = useState<Squares>(() => emptyBoard(settings.boardSize));
  // The squares the player may click (`FUN_00401dd0`), recomputed at the start and after each of
  // the computer's turns, its opening included.
  const [allowed, setAllowed] = useState<readonly boolean[]>(() => clickable(emptyBoard(settings.boardSize)));
  // A game in progress (the original's flag at +0x189).
  const [active, setActive] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState<{ side: Side; at: Point; size: number } | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const { busy, run, stop } = useTurns();

  const current = useRef({ settings, board: squares });
  useEffect(() => {
    current.current.settings = settings;
  });
  // rand(), seeded with the time when first needed, like the original's srand(time()).
  const seeded = useRef<Rand | null>(null);
  const rand = () => (seeded.current ??= msvcRand(Date.now()))();

  useEffect(() => saveMeltdownSettings(settings), [settings]);

  const sound = (event: SoundEvent) => playEvent(current.current.settings, event);

  const commit = (board: Squares) => {
    current.current.board = board;
    setSquares(board);
  };

  /**
   * A unit flies from its side's piece to its square (`FUN_004024e0`), sized for the square's
   * new value, then lands with its sound.
   */
  const fly = async (square: number, value: number, alive: () => void, signal: AbortSignal) => {
    const side: Side = value > 10 ? COMPUTER : PLAYER;
    const size = flyingSize(units(value));
    const n = Math.round(Math.sqrt(current.current.board.length));
    const home = SIDE_PIECE[side];
    const from = { x: home.x + PIECE / 2 - size / 2, y: home.y + PIECE / 2 - size / 2 };
    const at = squareAt(n, square);
    const to = { x: at.x + SQUARE / 2 - size / 2, y: at.y + SQUARE / 2 - size / 2 };
    const speed = current.current.settings.animation;
    await animate(from, to, speed, (p) => setMoving({ side, at: p, size }), signal);
    alive();
    setMoving(null);
  };

  /** The chain reaction's units each play a sound at once: the last one is heard. */
  const reactionSound = (events: Event[]) => {
    const last = events.at(-1);
    if (last) sound(last);
  };

  /** The end (`FUN_00401ee0`): a side is wiped off the board. */
  const gameOver = async () => {
    const lost = totals(current.current.board).player === 0;
    setActive(false);
    sound(lost ? 'Defeat' : 'Victory');
    await new Promise<void>((resolve) =>
      setModal({
        kind: 'end',
        outcome: lost ? 'lose' : 'win',
        lines: [lost ? 'You are wiped' : 'I am wiped', 'off the board!'],
        resolve,
      }),
    );
  };

  /** The computer's turn: think, place a unit, react (`FUN_00402740`, in `FUN_00402180`). */
  const computerTurn = async (alive: () => void, signal: AbortSignal, opening: boolean) => {
    setThinking(true);
    await pause();
    alive();
    const board = current.current.board;
    const square = computerMove(board, current.current.settings.skill, rand);
    setThinking(false);
    if (square < 0) return;
    const value = board[square] === 0 ? 11 : board[square]! + 1;
    await fly(square, value, alive, signal);
    sound('Computer Expands');
    if (opening) {
      // The opening move sets off no reaction. The original does not recompute the clickable
      // squares after it either, which leaves the computer's square clickable (a click there
      // gave it to the player, who lost); fixed here (see docs/games/meltdown.md).
      const next = [...board];
      next[square] = value;
      commit(next);
      setAllowed(clickable(next));
      return;
    }
    const { board: after, events } = computerPlace(board, square);
    commit(after);
    reactionSound(events);
    if (totals(after).player === 0) await gameOver();
    setAllowed(clickable(after));
  };

  /** The player's click (`FUN_00402180`): a unit, its reaction, then the computer. */
  const playerTurn = (square: number) =>
    run(async (alive, signal) => {
      const board = current.current.board;
      await fly(square, board[square]! + 1, alive, signal);
      sound('Player Expands');
      const { board: after, events } = playerPlace(board, square);
      commit(after);
      reactionSound(events);
      const t = totals(after);
      // No computer units: its first move is still to come, or it has been wiped out.
      if (t.computer === 0 && t.player !== 1) return gameOver();
      await computerTurn(alive, signal, false);
    });

  /** Game › New, and every restart (`FUN_00401a30`): the computer may open. */
  const newGame = (s: Settings = current.current.settings) => {
    stop();
    const board = emptyBoard(s.boardSize);
    commit(board);
    setAllowed(clickable(board));
    setMoving(null);
    setThinking(false);
    setActive(true);
    if (!s.playerFirst) run((alive, signal) => computerTurn(alive, signal, true));
  };

  const exit = useStartExit(TITLE, settings, onExit);
  useEffect(() => {
    if (!current.current.settings.playerFirst) newGame();
    // Once, when the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSquare = (square: number) => {
    if (modal || busy) return;
    if (!active || square < 0 || !allowed[square]) {
      beep();
      return;
    }
    playerTurn(square);
  };

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

  const close = () => setModal(null);

  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game meltdown board-game"
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
        canClick={(square) => allowed[square] === true}
        onSquare={onSquare}
      />

      {modal?.kind === 'options' && (
        <OptionsDialog
          settings={settings}
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

      {modal?.kind === 'end' && (
        <EndDialog
          title={TITLE}
          outcome={modal.outcome}
          lines={modal.lines}
          onOk={() => {
            modal.resolve();
            close();
          }}
        />
      )}

      {modal?.kind === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          controls="A square explodes at 2 units in a corner, 3 on an edge, 4 inside. Click (or tap) an empty square or one of yours; F2 starts a new game."
          onClose={close}
        />
      )}

      {modal?.kind === 'about' && <AboutDialog title={TITLE} onClose={close} />}
    </Window>
  );
}
