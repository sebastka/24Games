import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../index.ts';
import { CONFIRM_NEW, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { gameById } from '../../shell/catalog.ts';
import { animate, type Point } from '../../shell/czgame/animate.ts';
import { pause, useTurns } from '../../shell/czgame/turns.ts';
import { EndDialog, type Outcome } from '../../shell/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { msvcRand, type Rand } from '../../shell/random.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { HOME, pieceAt } from './layout.ts';
import {
  COMPUTER,
  computerMove,
  count,
  flips,
  hasMove,
  isLegal,
  play,
  PLAYER,
  startBoard,
  type Board as Squares,
  type Side,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadReversiSettings, saveReversiSettings, type Settings, type SoundEvent } from './settings.ts';
import '../../shell/czgame/style.css';
import './style.css';

const INFO = gameById('reversi')!;
const TITLE = 'Reversi Plus';

/** Dialogs that a running turn waits for. */
type Pending = { kind: 'pass'; side: Side } | { kind: 'end'; outcome: Outcome; lines: [string, string] };
type Modal = { kind: 'options' | 'rules' | 'about' | 'new' } | (Pending & { resolve: () => void });

const END_SOUND: Record<Outcome, SoundEvent> = { lose: 'Defeat', win: 'Victory', tie: 'Tie' };

export default function ReversiPlus({ onExit }: GameProps) {
  const [settings, setSettings] = useState<Settings>(loadReversiSettings);
  const [squares, setSquares] = useState<Squares>(() => startBoard(settings.crossed));
  // A game in progress (the original's flag at 0x29c): once over, clicks only beep.
  const [active, setActive] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState<{ side: Side; at: Point } | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);

  // The running turn reads the latest values through refs.
  const current = useRef({ settings, squares });
  useEffect(() => {
    current.current.settings = settings;
  });
  const { busy, run, stop } = useTurns();
  // rand(), seeded with the time when first needed, like the original's srand(time()).
  const seeded = useRef<Rand | null>(null);
  const rand = () => (seeded.current ??= msvcRand(Date.now()))();

  useEffect(() => saveReversiSettings(settings), [settings]);

  const sound = (event: SoundEvent) => playEvent(current.current.settings, event);

  const commit = (next: Squares) => {
    current.current.squares = next;
    setSquares(next);
  };

  const ask = (m: Pending) => new Promise<void>((resolve) => setModal({ ...m, resolve }));

  /** A move with its animation, flips and sounds (`FUN_0040b1c0`). */
  const move = async (side: Side, square: number, alive: () => void, signal: AbortSignal) => {
    sound(side === PLAYER ? "Move Player's Piece" : "Move Computer's Piece");
    await animate(
      HOME[side],
      pieceAt(square),
      current.current.settings.animation,
      (at) => setMoving({ side, at }),
      signal,
    );
    alive();
    const before = current.current.squares;
    if (flips(before, square, side).length > 0) {
      sound(side === PLAYER ? "Capture Computer's Piece" : "Capture Player's Piece");
    }
    commit(play(before, square, side));
    setMoving(null);
  };

  /** The computer thinks (an hourglass, `FUN_0040ace0`), then plays. */
  const computerTurn = async (alive: () => void, signal: AbortSignal) => {
    setThinking(true);
    await pause();
    alive();
    const square = computerMove(current.current.squares, current.current.settings.skill, rand);
    setThinking(false);
    await move(COMPUTER, square, alive, signal);
  };

  /** End of the game (`FUN_0040a9a0`): the scores, a sound and the dialog. */
  const gameOver = async (alive: () => void) => {
    const board = current.current.squares;
    const mine = count(board, COMPUTER);
    const yours = count(board, PLAYER);
    const outcome: Outcome = yours < mine ? 'lose' : mine < yours ? 'win' : 'tie';
    sound(END_SOUND[outcome]);
    setActive(false);
    await ask({ kind: 'end', outcome, lines: [`Your Score : ${yours}`, `My Score : ${mine}`] });
    alive();
  };

  /** After the player's move (`FUN_0040a570`): passes, the computer's moves, the end. */
  const afterPlayer = async (alive: () => void, signal: AbortSignal) => {
    const board = () => current.current.squares;
    if (!hasMove(board(), COMPUTER)) {
      if (hasMove(board(), PLAYER)) {
        await ask({ kind: 'pass', side: COMPUTER });
        return;
      }
      await gameOver(alive);
      return;
    }
    for (;;) {
      await computerTurn(alive, signal);
      if (!hasMove(board(), COMPUTER) || hasMove(board(), PLAYER)) break;
      await ask({ kind: 'pass', side: PLAYER });
      alive();
    }
    if (!hasMove(board(), COMPUTER) && !hasMove(board(), PLAYER)) await gameOver(alive);
  };

  /** Game › New, and every restart (`FUN_0040a3d0`): the computer may move first. */
  const newGame = (s: Settings = current.current.settings) => {
    stop();
    commit(startBoard(s.crossed));
    setMoving(null);
    setThinking(false);
    setActive(true);
    if (!s.playerFirst) run(computerTurn);
  };

  const exit = useStartExit(TITLE, settings, onExit);
  useEffect(() => {
    if (!current.current.settings.playerFirst) newGame();
    // Once, when the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSquare = (square: number) => {
    if (modal || busy) return;
    if (!active || square < 0 || !isLegal(squares, square, PLAYER)) {
      beep();
      return;
    }
    run(async (alive, signal) => {
      await move(PLAYER, square, alive, signal);
      await afterPlayer(alive, signal);
    });
  };

  /** Game › New (F2): asks first if a game is in progress. */
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
  const resolve = () => {
    if (modal && 'resolve' in modal) modal.resolve();
    setModal(null);
  };

  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game reversi board-game"
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
        canPlay={(square) => active && !busy && isLegal(squares, square, PLAYER)}
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

      {modal?.kind === 'pass' && (
        <MessageBox
          icon="info"
          title={modal.side === COMPUTER ? 'Computer Must Pass' : 'Player Must Pass'}
          text={modal.side === COMPUTER ? 'I have no moves available.' : 'You have no moves available.'}
          onOk={resolve}
        />
      )}

      {modal?.kind === 'end' && <EndDialog title={TITLE} outcome={modal.outcome} lines={modal.lines} onOk={resolve} />}

      {modal?.kind === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          controls="Click (or tap) a square to play there; F2 starts a new game."
          onClose={close}
        />
      )}

      {modal?.kind === 'about' && <AboutDialog title={TITLE} onClose={close} />}
    </Window>
  );
}
