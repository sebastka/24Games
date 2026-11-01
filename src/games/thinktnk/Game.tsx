import { useEffect, useRef, useState } from 'react';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf } from '../../shell/highscores.ts';
import { isKey } from '../../shell/keys.ts';
import { useFixedStep } from '../../shell/loop.ts';
import { playEvent, useStartExit } from '../../shell/sound.ts';
import { TouchPad } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { LevelDialog, OuchDialog } from './Dialogs.tsx';
import { Field } from './Field.tsx';
import { newGame, nextLevel, press, respawn, step, TICK_MS, type Key, type Sound, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Action, type Settings, type SoundEvent } from './settings.ts';
import '../../shell/arcade.css';
import './style.css';

const INFO = gameById('thinktnk')!;
const TITLE = 'Think Tank';
const random = Math.random;
/** One high score table (FUN_00407c10), titled "Hall of Fame". */
const TABLE = 'scores';

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'level'; level: number; timeBonus: number; bonus: number }
  | { kind: 'ouch'; level: number; tanks: number }
  | { kind: 'lose' }
  | { kind: 'name'; place: number }
  | null;

export default function ThinkTank({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGameState] = useState(() => newGame(random));
  const current = useRef(game);
  const [open, setOpen] = useState<Open>(null);
  const [scores, setScores] = useState(() => loadScores('thinktnk'));
  const [menuOpen, setMenuOpen] = useState(false);

  const setGame = (state: State) => {
    current.current = state;
    setGameState(state);
  };

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('thinktnk', scores), [scores]);

  const sound = (event: SoundEvent) => playEvent(settings, event);
  const sounds = (list: Sound[]) => list.forEach(sound);

  // The start sound when the window opens, then the first level's "Begin Level".
  const exit = useStartExit(TITLE, settings, onExit);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sound('Begin Level');
  });

  useFixedStep(TICK_MS, game.running && open === null && !menuOpen, () => {
    const { state, sounds: heard, outcome } = step(current.current, random);
    setGame(state);
    sounds(heard);
    if (!outcome) return;
    if (outcome.kind === 'level') setOpen({ ...outcome, level: state.level });
    else if (outcome.kind === 'destroyed') setOpen({ kind: 'ouch', level: state.level, tanks: state.tanks });
    else setOpen({ kind: 'lose' });
  });

  const act = (key: Key) => {
    if (open) return;
    const result = press(current.current, key);
    setGame(result.state);
    sounds(result.sounds);
  };

  const restart = () => {
    setGame(newGame(random));
    sound('Begin Level');
  };
  // Game › New asks first while a game is in progress (message 1001).
  const askNew = () => (current.current.active ? setOpen('confirm-new') : restart());

  /** After You Lose!: the name for the high score table, if the score earns a place. */
  const afterDefeat = () => {
    const place = placeOf(tableOf(scores, TABLE), current.current.score);
    setOpen(place >= 0 ? { kind: 'name', place } : null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') askNew();
      else {
        const action = (Object.keys(settings.keys) as Action[]).find((a) => isKey(e, settings.keys[a]));
        if (!action) return;
        act(action);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      onMenuChange={setMenuOpen}
      className="game arcade thinktnk"
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
      <Field state={game} background={settings.background} onTurn={act} onFire={() => act('fire')} />
      <TouchPad
        onPress={act}
        left={{ label: 'Fire', onClick: () => act('fire') }}
        right={{ label: 'New', onClick: askNew }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          playing={game.active}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK starts a new game.
            setSettings(next);
            restart();
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
          title="Hall of Fame"
          table={tableOf(scores, TABLE)}
          onClose={() => setOpen(null)}
          onClear={() => setScores(cleared(scores, TABLE))}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'level' && (
        <LevelDialog
          level={open.level}
          timeBonus={open.timeBonus}
          bonus={open.bonus}
          onOk={() => {
            setGame(nextLevel(current.current, random));
            sound('Begin Level');
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'ouch' && (
        <OuchDialog
          level={open.level}
          tanks={open.tanks}
          onOk={() => {
            setGame(respawn(current.current, random));
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'lose' && (
        <EndDialog title={TITLE} outcome="lose" lines={['You have', 'no more tanks!']} onOk={afterDefeat} />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'name' && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, TABLE, open.place, name, current.current.score));
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
                The tank rolls on by itself and turns where the lanes cross. Yellow pellets give an extra shot, red ones
                faster bullets, blue ones a faster tank, the star an extra tank. A level completed without destroying
                any enemy earns 1000 points; with every enemy destroyed but no green pellet taken, 300.
              </p>
              <p>
                Keyboard: the arrow keys turn the tank, Space fires (Options › Player Keys changes them), F2 starts a
                new game. On a touch screen, swipe on the play field to turn, tap it to fire, or use the buttons below
                it.
              </p>
            </>
          }
        />
      )}

      {open === 'about' && <AboutDialog title={TITLE} onClose={() => setOpen(null)} />}
    </Window>
  );
}
