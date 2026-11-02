import { useEffect, useRef, useState } from 'react';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { placeOf, tableOf } from '../../shell/highscores.ts';
import { useHighScores } from '../../shell/useHighScores.ts';
import { isKey } from '../../shell/keys.ts';
import { useFixedStep } from '../../shell/loop.ts';
import { playEvent, useStartExit } from '../../shell/sound.ts';
import { TouchPad } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { GotchaDialog, LevelDialog } from './Dialogs.tsx';
import { Field } from './Field.tsx';
import {
  detonate,
  loseMouse,
  move,
  newGame,
  nextLevel,
  pounceTarget,
  SIZES,
  step,
  TICK_MS,
  type Direction,
  type Sound,
  type State,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Action, type Settings, type SoundEvent } from './settings.ts';
import '../../shell/arcade.css';
import './style.css';

const INFO = gameById('cheesy')!;
const TITLE = 'Cheesy Pursuit';
const random = Math.random;

/**
 * The cat's pounce on the mouse (FUN_00409440): 2 pixels per step, each step after a busy loop
 * of AnimationDelay × 10 iterations (the setup calibrates AnimationDelay by CPU: 14000 on a
 * Pentium, about 1.5 ms of looping) plus the redrawing: about 5 ms per step here.
 */
const POUNCE_STEP = 2;
const POUNCE_STEP_MS = 5;

/** The table of a board size, and its title (FUN_00401d90). */
const tableKey = (size: number) => String(size);
const hallOfFame = (size: number) => `Hall of Fame - ${SIZES[size]?.label ?? ''} board`;

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'level'; level: number }
  | { kind: 'gotcha'; mice: number }
  | { kind: 'lose' }
  | { kind: 'name'; place: number }
  | null;

interface Pounce {
  index: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export default function CheesyPursuit({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGameState] = useState(() => newGame(settings.size, random));
  const current = useRef(game);
  const [open, setOpen] = useState<Open>(null);
  const [pounce, setPounce] = useState<Pounce | null>(null);
  const [pounceAt, setPounceAt] = useState<{ x: number; y: number } | null>(null);
  const { scores, record: recordScore, clear: clearScores } = useHighScores('cheesy');
  const [menuOpen, setMenuOpen] = useState(false);

  const setGame = (state: State) => {
    current.current = state;
    setGameState(state);
  };

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => playEvent(settings, event);
  const sounds = (list: Sound[]) => list.forEach(sound);
  const exit = useStartExit(TITLE, settings, onExit);

  useFixedStep(TICK_MS, game.running && open === null && pounce === null && !menuOpen, () => {
    const { state, caught } = step(current.current, random);
    setGame(state);
    if (caught === null) return;
    // A cat has the mouse: the timer stops, the cat pounces.
    sound('Cat Gets Mouse');
    const cat = state.cats[caught]!;
    setPounce({ index: caught, from: { x: cat.x, y: cat.y }, to: pounceTarget(state) });
  });

  // The pounce, then GOTCHA! or, for the last mouse, You Lose!.
  useEffect(() => {
    if (!pounce) return;
    const { from, to, index } = pounce;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const begin = performance.now();
    let id = 0;
    const frame = (now: number) => {
      const travelled = Math.floor((now - begin) / POUNCE_STEP_MS) * POUNCE_STEP;
      if (travelled < distance) {
        const t = travelled / distance;
        setPounceAt({ x: Math.trunc(from.x + (to.x - from.x) * t), y: Math.trunc(from.y + (to.y - from.y) * t) });
        id = requestAnimationFrame(frame);
        return;
      }
      const g = current.current;
      setGame({ ...g, running: false, cats: g.cats.map((c, i) => (i === index ? { ...c, ...to } : c)) });
      setPounce(null);
      setPounceAt(null);
      if (g.lives > 1) setOpen({ kind: 'gotcha', mice: g.lives - 1 });
      else {
        sound('Defeat');
        setOpen({ kind: 'lose' });
      }
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
    // Runs once per pounce; the sound settings cannot change meanwhile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pounce]);

  const act = (direction: Direction) => {
    if (open || pounce) return;
    const result = move(current.current, direction);
    setGame(result.state);
    sounds(result.sounds);
    if (result.complete) setOpen({ kind: 'level', level: result.state.level });
  };

  const bomb = () => {
    if (open || pounce) return;
    const result = detonate(current.current);
    setGame(result.state);
    sounds(result.sounds);
  };

  const restart = (s = settings) => {
    setGame(newGame(s.size, random));
  };
  // Game › New asks first while a game is in progress (message 1001).
  const askNew = () => (current.current.active ? setOpen('confirm-new') : restart());

  /** After You Lose!: the name for the high score table, if the score earns a place. */
  const afterDefeat = () => {
    const place = placeOf(tableOf(scores, tableKey(settings.size)), current.current.score);
    if (place >= 0) setOpen({ kind: 'name', place });
    else {
      setGame(loseMouse(current.current));
      setOpen(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The original is busy animating the pounce and reads no key.
      if (pounce) return;
      if (e.key === 'F2') askNew();
      else {
        const action = (Object.keys(settings.keys) as Action[]).find((a) => isKey(e, settings.keys[a]));
        if (!action) return;
        if (action === 'bomb') bomb();
        else act(action);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const table = tableOf(scores, tableKey(settings.size));
  return (
    <Window
      title={game.active ? `${TITLE} - Level ${game.level}` : TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      onMenuChange={setMenuOpen}
      className="game arcade cheesy"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('scores') },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', shortcut: 'Alt+F4', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: `~About ${TITLE}...`, onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Field
        state={game}
        pounce={pounce && pounceAt && { index: pounce.index, ...pounceAt }}
        mouse={settings.mouse}
        background={settings.background}
        onMove={act}
      />
      <TouchPad onPress={act} left={{ label: 'Bomb', onClick: bomb }} right={{ label: 'New', onClick: askNew }} />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          playing={game.active}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK starts a new game (with the new board size).
            setSettings(next);
            restart(next);
            setOpen(null);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_NEW}
          onYes={() => {
            restart();
            setOpen(null);
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={hallOfFame(settings.size)}
          table={table}
          onClose={() => setOpen(null)}
          onClear={clearScores && (() => clearScores(tableKey(settings.size)))}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'level' && (
        <LevelDialog
          title={TITLE}
          level={open.level}
          mouse={settings.mouse}
          onOk={() => {
            setGame(nextLevel(current.current, random));
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'gotcha' && (
        <GotchaDialog
          title={TITLE}
          mice={open.mice}
          onOk={() => {
            setGame(loseMouse(current.current));
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'lose' && (
        <EndDialog title={TITLE} outcome="lose" lines={['The cats got', 'all your mice!']} onOk={afterDefeat} />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'name' && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            recordScore(tableKey(settings.size), open.place, name, current.current.score);
            setGame(loseMouse(current.current));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          onClose={() => setOpen(null)}
          controls={
            <>
              <p>
                Eat every cheddar slice to complete a level. A gouda raises the value of the slices; a CheeseBomb, set
                off with the bomb key, turns every cat back. A new mouse comes every 20,000 points.
              </p>
              <p>
                Keyboard: the arrow keys move the mouse, Space sets off a CheeseBomb (Options › Player Keys changes
                them), F2 starts a new game. On a touch screen, swipe on the play field or use the buttons below it.
              </p>
            </>
          }
        />
      )}

      {open === 'about' && <AboutDialog title={TITLE} onClose={() => setOpen(null)} />}
    </Window>
  );
}
