import { useEffect, useRef, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { playSound } from '../../shell/sound.ts';
import { TouchPad } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { HighScoreDialog, NameDialog } from '../cheesy/common/HighScores.tsx';
import { emptyTable, insert, loadScores, placeOf, saveScores, tableOf } from '../cheesy/common/highscores.ts';
import { isKey } from '../cheesy/common/keys.ts';
import { LoseDialog } from '../cheesy/common/LoseDialog.tsx';
import { useFixedStep } from '../cheesy/common/loop.ts';
import '../cheesy/common/style.css';
import { LevelDialog, OuchDialog } from './Dialogs.tsx';
import { Field } from './Field.tsx';
import { newGame, nextLevel, press, respawn, step, TICK_MS, type Key, type Sound, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import './style.css';
import { loadSettings, saveSettings, type Action, type Settings, type SoundEvent } from './settings.ts';

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

  const setGame = (state: State) => {
    current.current = state;
    setGameState(state);
  };

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('thinktnk', scores), [scores]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };
  const sounds = (list: Sound[]) => list.forEach(sound);

  // The start sound when the window opens, then the first level's "Begin Level".
  useEffect(() => {
    const s = loadSettings();
    for (const event of ['Think Tank Start', 'Begin Level'] as const) {
      const name = s.sounds[event];
      if (s.soundEnabled && name) playSound(name);
    }
  }, []);

  const exit = () => {
    sound('Think Tank Exit');
    onExit();
  };

  useFixedStep(TICK_MS, game.running && open === null, () => {
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
        <Dialog
          title={TITLE}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                restart();
                setOpen(null);
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'scores' && (
        <HighScoreDialog
          title="Hall of Fame"
          table={tableOf(scores, TABLE)}
          onClose={() => setOpen(null)}
          onClear={() => setScores({ ...scores, tables: { ...scores.tables, [TABLE]: emptyTable() } })}
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
        <LoseDialog title={TITLE} lines={['You have', 'no more tanks!']} onOk={afterDefeat} />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'name' && (
        <NameDialog
          title="Enter your high score"
          name={scores.player}
          onOk={(name) => {
            const entry = { name, score: current.current.score };
            setScores({
              player: name,
              tables: { ...scores.tables, [TABLE]: insert(tableOf(scores, TABLE), open.place, entry) },
            });
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title={`How to Play ${TITLE}`}
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              The tank rolls on by itself and turns where the lanes cross. Yellow pellets give an extra shot, red ones
              faster bullets, blue ones a faster tank, the star an extra tank. A level completed without destroying any
              enemy earns 1000 points; with every enemy destroyed but no green pellet taken, 300.
            </p>
            <p>
              Keyboard: the arrow keys turn the tank, Space fires (Options › Player Keys changes them), F2 starts a new
              game. On a touch screen, swipe on the play field to turn, tap it to fire, or use the buttons below it.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title={`About ${TITLE}`}
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>{TITLE} copyright © 1995 by The Code Zone.</p>
            <p>
              From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software,
              Inc.
            </p>
            <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
