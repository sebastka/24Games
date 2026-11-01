import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../index.ts';
import { gameById } from '../../shell/catalog.ts';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { msvcRand, type Rand } from '../reversi/logic.ts';
import { animate, type Point } from '../reversi/shared/animate.ts';
import { CONFIRM_NEW, ConfirmBox } from '../reversi/shared/Boxes.tsx';
import { EndDialog, type Outcome } from '../reversi/shared/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../reversi/shared/HelpDialogs.tsx';
import '../reversi/shared/style.css';
import { pause, useTurns } from '../reversi/shared/turns.ts';
import { Board } from './Board.tsx';
import { dropFrom, pieceAt } from './layout.ts';
import {
  boardFull,
  CELLS,
  COMPUTER,
  computerMove,
  drop,
  isFull,
  PLAYER,
  start,
  winner,
  winningFour,
  type Position,
  type Side,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadConnectSettings, saveConnectSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('connect')!;
const TITLE = 'Checker Connector';

type Modal =
  | { kind: 'options' | 'rules' | 'about' | 'new' }
  | { kind: 'end'; outcome: Outcome; lines: [string, string]; resolve: () => void };

const END: Record<Outcome, { sound: SoundEvent; lines: [string, string] }> = {
  win: { sound: 'Victory', lines: ['You got four', 'in a row!'] },
  lose: { sound: 'Defeat', lines: ['I got four', 'in a row!'] },
  tie: { sound: 'Tie', lines: ['We filled', 'the board!'] },
};

export default function CheckerConnector({ onExit }: GameProps) {
  const [settings, setSettings] = useState<Settings>(loadConnectSettings);
  const [position, setPosition] = useState<Position>(() => start(false));
  // A game in progress (the original's flag at 0x411058).
  const [active, setActive] = useState(true);
  // The computer threatens to win: " - Check!" in the title.
  const [check, setCheck] = useState(false);
  const [lit, setLit] = useState<readonly number[]>([]);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState<{ side: Side; at: Point } | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const { busy, run, stop } = useTurns();

  const current = useRef({ settings, position });
  useEffect(() => {
    current.current.settings = settings;
  });
  // rand(), seeded with the time when first needed, like the original's srand(time()).
  const seeded = useRef<Rand | null>(null);
  const rand = () => (seeded.current ??= msvcRand(Date.now()))();

  useEffect(() => saveConnectSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const { soundEnabled, sounds } = current.current.settings;
    const name = sounds[event];
    if (soundEnabled && name) playSound(name);
  };

  const commit = (next: Position) => {
    current.current.position = next;
    setPosition(next);
  };

  /** A piece falls into `column` from above the window, then lands with its sound. */
  const fall = async (side: Side, column: number, alive: () => void, signal: AbortSignal) => {
    const row = current.current.position.heights[column]!;
    const speed = current.current.settings.animation;
    await animate(dropFrom(column), pieceAt(column, row), speed, (at) => setMoving({ side, at }), signal);
    alive();
    setMoving(null);
    commit(drop(current.current.position, column));
    sound(side === PLAYER ? 'Player Piece Move' : 'Enemy Piece Move');
  };

  /** The end (in `FUN_00401ac0`): the four lit up, a sound and the dialog. */
  const gameOver = async (outcome: Outcome) => {
    setActive(false);
    setLit(winningFour(current.current.position));
    sound(END[outcome].sound);
    await new Promise<void>((resolve) => setModal({ kind: 'end', outcome, lines: END[outcome].lines, resolve }));
  };

  /** The player drops a piece, then the computer answers (`FUN_00401ac0`). */
  const playColumn = (column: number) =>
    run(async (alive, signal) => {
      setCheck(false);
      await fall(PLAYER, column, alive, signal);
      if (winner(current.current.position.cells) === PLAYER) return gameOver('win');
      setThinking(true);
      await pause();
      alive();
      const reply = computerMove(current.current.position, current.current.settings.skill, rand);
      setThinking(false);
      if (reply.column >= 0) await fall(COMPUTER, reply.column, alive, signal);
      if (reply.check) {
        setCheck(true);
        sound('Player in Check');
      }
      const p = current.current.position;
      if (winner(p.cells) === COMPUTER) await gameOver('lose');
      else if (reply.column < 0 || p.count >= CELLS || boardFull(p)) await gameOver('tie');
    });

  /** Game › New, and every restart (`FUN_004015c0`): the computer may open in column D. */
  const newGame = (s: Settings = current.current.settings) => {
    stop();
    commit(start(false));
    setLit([]);
    setCheck(false);
    setMoving(null);
    setThinking(false);
    setActive(true);
    if (!s.playerFirst) {
      run(async (alive, signal) => {
        await animate(dropFrom(3), pieceAt(3, 0), s.animation, (at) => setMoving({ side: COMPUTER, at }), signal);
        alive();
        setMoving(null);
        commit(start(true));
        sound('Enemy Piece Move');
      });
    }
  };

  useEffect(() => {
    sound('Checker Connector Start');
    if (!current.current.settings.playerFirst) newGame();
    // Once, when the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canDrop = (column: number) => active && !busy && !isFull(position, column);

  const askNew = () => (active ? setModal({ kind: 'new' }) : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || e.ctrlKey || e.altKey || e.metaKey) return;
      const column = 'ABCDEFG'.indexOf(e.key.toUpperCase());
      if (e.key === 'F2') askNew();
      else if (column >= 0 && e.key.length === 1) {
        // Keys A-G drop into a column; the original beeps once the game is over.
        if (busy) return;
        if (!active) beep();
        else if (!isFull(position, column)) playColumn(column);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exit = () => {
    sound('Checker Connector Exit');
    onExit();
  };

  const close = () => setModal(null);

  return (
    <Window
      title={check ? `${TITLE} - Check!` : TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game connect board-game"
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
        cells={position.cells}
        lit={lit}
        board={settings.board}
        pieceSet={settings.pieceSet}
        moving={moving}
        thinking={thinking}
        canDrop={canDrop}
        onColumn={(column) => !modal && canDrop(column) && playColumn(column)}
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
          onClose={() => {
            modal.resolve();
            close();
          }}
        />
      )}

      {modal?.kind === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          controls="Click (or tap) a column, or press its letter (A-G), to drop a piece there; F2 starts a new game."
          onClose={close}
        />
      )}

      {modal?.kind === 'about' && <AboutDialog title={TITLE} onClose={close} />}
    </Window>
  );
}
