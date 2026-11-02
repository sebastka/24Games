import { useCallback, useEffect, useRef, useState } from 'react';
import diagonal from '../../assets/stackblz/diagonal.png';
import horizontal from '../../assets/stackblz/horizontal.png';
import pieces from '../../assets/stackblz/pieces.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { CONFIRM_NEW, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { useImages } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { placeOf, tableOf } from '../../shell/highscores.ts';
import { useHighScores } from '../../shell/useHighScores.ts';
import { useFrameLoop } from '../../shell/loop.ts';
import { randomRand } from '../../shell/random.ts';
import { playEvent, useStartExit } from '../../shell/sound.ts';
import { TouchPad, type PadDirection } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { Board, type Art } from './Board.tsx';
import { act, initial, newGame, restartTimer, step, stop, type Action, type GameEvent, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { actionFor, loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'stackblz';
const INFO = gameById(ID)!;

/** Touch pad arrows, as the default keys: ▲ is the Up key, "Rotate Down". */
const PAD: Record<PadDirection, Action> = { left: 'left', right: 'right', up: 'rotateDown', down: 'rotateUp' };

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'game-over' }
  | { kind: 'high-score'; score: number; rank: number }
  | null;

export default function StackBlitz({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const { scores, record: recordScore, clear: clearScores } = useHighScores(ID);
  const [view, setView] = useState<State>(() => initial(randomRand));
  const [started, setStarted] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const game = useRef(view);
  const settingsRef = useRef(settings);
  // The tables as the game loop's callbacks see them (they are created once).
  const scoresRef = useRef(scores);
  const background = BACKGROUNDS[settings.background];
  const images = useImages(
    background?.texture ? [pieces, horizontal, diagonal, background.texture] : [pieces, horizontal, diagonal],
  );
  const art: Art | null = images && {
    pieces: images[0]!,
    horizontal: images[1]!,
    diagonal: images[2]!,
    texture: images[3] ?? null,
  };

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const sound = useCallback((event: SoundEvent) => playEvent(settingsRef.current, event), []);
  const exit = useStartExit('StackBlitz', settings, onExit);

  /** Takes the new state and plays what happened; a game over brings the high score dialogs. */
  const apply = useCallback(
    (state: State, events: readonly GameEvent[]) => {
      game.current = state;
      setView(state);
      for (const e of events) sound(e);
      if (events.includes('Game Over')) {
        const rank = placeOf(tableOf(scoresRef.current, 0), state.score);
        setOpen(rank >= 0 ? { kind: 'high-score', score: state.score, rank } : { kind: 'game-over' });
      }
    },
    [sound],
  );

  const doAction = (action: Action) => {
    if (open || !game.current.playing) return;
    const r = act(game.current, action, randomRand);
    apply(r.state, r.events);
  };

  const start = () => {
    const r = newGame(game.current, randomRand);
    setStarted(true);
    apply(r.state, r.events);
    setOpen(null);
  };
  const askNew = () => (game.current.playing ? setOpen('confirm-new') : start());

  // The game's timer, on animation frames: whole milliseconds of simulated time, paused while
  // the tab is hidden, a dialog is open or a menu is pulled down. Like the original's Timer::Start
  // after a pause, the timer's count restarts on resuming.
  const carry = useRef(0);
  useFrameLoop(
    open === null && !menuOpen,
    (elapsed) => {
      let state = game.current;
      if (!state.playing) {
        carry.current = 0;
        return;
      }
      carry.current += elapsed;
      const events: GameEvent[] = [];
      for (; carry.current >= 1 && state.playing; carry.current--) {
        const r = step(state, [], randomRand);
        state = r.state;
        events.push(...r.events);
      }
      carry.current %= 1;
      if (state !== game.current) apply(state, events);
    },
    () => {
      game.current = restartTimer(game.current);
    },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'F2') askNew();
      else {
        const action = game.current.playing ? actionFor(settings.keys, e) : undefined;
        if (!action) return;
        doAction(action);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Window
      title="StackBlitz"
      icon={INFO.smallIcon}
      onClose={exit}
      onMenuChange={setMenuOpen}
      className="game stackblz"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: 'Show High Scores...', onSelect: () => setOpen('scores') },
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
            { label: '~About StackBlitz...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Board
        state={view}
        art={art}
        pieceSet={settings.pieceSet}
        background={settings.background}
        values={started}
        onAction={doAction}
      />
      <TouchPad
        onPress={(d) => doAction(PAD[d])}
        left={{ label: 'New', onClick: askNew }}
        right={{ label: 'Drop', onClick: () => doAction('drop'), disabled: !view.playing }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          sheet={pieces}
          playing={view.playing}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK ends the game in progress ("Press F2 To Begin").
            setSettings(next);
            apply(stop(game.current), []);
            setOpen(null);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <ConfirmBox title="StackBlitz" text={CONFIRM_NEW} onYes={start} onNo={() => setOpen(null)} />
      )}

      {open === 'scores' && (
        <HallOfFame
          title="Hall of Fame"
          table={tableOf(scores, 0)}
          onClose={() => setOpen(null)}
          onClear={clearScores && (() => clearScores(0))}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'high-score' && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            recordScore(0, open.rank, name, open.score);
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'game-over' && (
        <MessageBox title="Game Over" text="Sorry, you stacked 'em a bit too high!" onOk={() => setOpen(null)} />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="StackBlitz"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard (Game › Options › Keys): Left and Right arrows to move the stack, Down and Up arrows to rotate it, Space to drop it; F2 starts a new game. On a touch screen, drag the stack sideways, tap to rotate it, swipe down to drop it, or use the buttons below the play field."
        />
      )}

      {open === 'about' && <AboutDialog title="StackBlitz" onClose={() => setOpen(null)} />}
    </Window>
  );
}
