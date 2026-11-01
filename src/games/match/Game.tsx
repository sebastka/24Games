import { useEffect, useRef, useState } from 'react';
import aliens from '../../assets/match/aliens.png';
import back from '../../assets/match/back.png';
import cards from '../../assets/match/cards.png';
import found from '../../assets/match/found.png';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { HallOfFameDialog, HighScoreDialog, OutcomeDialog } from './Dialogs.tsx';
import { insert, loadScores, placeOf, saveScores, type Scores } from './hallOfFame.ts';
import {
  click,
  deal,
  formatTime,
  newClock,
  pause,
  resume,
  seconds,
  SKILLS,
  type ClickEvent,
  type Clock,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('match')!;
const TITLE = 'CardMatch';

const CLICK_SOUND: Record<ClickEvent, SoundEvent | null> = {
  flip: 'Flip Card',
  match: 'Make a match',
  victory: null,
  beep: null,
};

type Open =
  'options' | 'rules' | 'about' | 'scores' | 'abandon' | { won: string } | { highScore: string; place: number } | null;

export default function CardMatch({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState(() => deal(settings.skill));
  const [clock, setClock] = useState<Clock>(() => newClock(performance.now()));
  const [now, setNow] = useState(() => performance.now());
  const [scores, setScores] = useState<Scores>(() => loadScores('match', 3));
  const [open, setOpen] = useState<Open>(null);
  const [hidden, setHidden] = useState(() => document.hidden);
  // Whether the clock was paused by a dialog (or a hidden tab), to be resumed after it.
  const held = useRef(false);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('match', scores), [scores]);

  const sound = (event: SoundEvent | null) => {
    const name = event && settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  // "<title> Start", once (by default no sound).
  const [atStart] = useState(settings);
  useEffect(() => {
    const name = atStart.sounds[`${TITLE} Start`];
    if (atStart.soundEnabled && name) playSound(name);
  }, [atStart]);
  const exit = () => {
    sound(`${TITLE} Exit`);
    onExit();
  };

  // The original's 250 ms timer, which writes the time in the title bar.
  useEffect(() => {
    if (clock.paused) return;
    const timer = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(timer);
  }, [clock.paused]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Like the original when its window is deactivated, the clock stops while a dialog is open.
  const suspended = open !== null || hidden;
  useEffect(() => {
    const t = performance.now();
    setClock((c) => {
      if (suspended && !c.paused) {
        held.current = true;
        return pause(c, t);
      }
      if (!suspended && held.current) {
        held.current = false;
        return resume(c, t);
      }
      return c;
    });
  }, [suspended]);

  const newGame = (skill = settings.skill) => {
    held.current = false;
    setGame(deal(skill));
    setClock(newClock(performance.now()));
  };

  // Game › New: a game whose clock runs is in progress, and is abandoned only on confirmation.
  const askNewGame = () => (clock.paused && !held.current ? newGame() : setOpen('abandon'));

  const turn = (i: number) => {
    if (open) return;
    const t = performance.now();
    // Any click on a card starts (or restarts) the clock, even on a matched card.
    let c = resume(clock, t);
    const { state, event } = click(game, i);
    setGame(state);
    if (event === 'beep') beep();
    sound(CLICK_SOUND[event]);
    if (event === 'victory') {
      c = pause(c, t);
      setOpen({ won: formatTime(seconds(c, t)) });
      sound('Victory');
    }
    setClock(c);
    setNow(t);
  };

  const afterVictory = (time: string) => {
    const place = placeOf(scores.tables[settings.skill - 1]!, time, false);
    setOpen(place >= 0 ? { highScore: time, place } : null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      if (!open) askNewGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const background = BACKGROUNDS[settings.background];
  const level = SKILLS[settings.skill];
  // The title shows the time while the clock runs; "Card Match" while the window is inactive.
  const title =
    open !== null ? 'Card Match' : clock.paused ? TITLE : `${TITLE} Time - ${formatTime(seconds(clock, now))}`;

  return (
    <Window
      title={title}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game match"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNewGame },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('scores') },
            { separator: true },
            { label: 'Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', shortcut: 'Alt+F4', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to play', onSelect: () => setOpen('rules') },
            { label: '~About ...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <div
        className="playfield"
        style={{
          backgroundColor: background?.color,
          backgroundImage: background?.texture && `url(${background.texture})`,
        }}
      >
        <Board state={game} faces={settings.skill === 3 ? aliens : cards} back={back} found={found} onClick={turn} />
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK always deals a new game.
            setSettings(next);
            newGame(next.skill);
            setOpen(null);
          }}
        />
      )}

      {open === 'abandon' && (
        <Dialog
          title={TITLE}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                newGame();
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
        <HallOfFameDialog
          title={`Hall of Fame - ${level}`}
          table={scores.tables[settings.skill - 1]!}
          onClear={() =>
            setScores({ ...scores, tables: scores.tables.map((t, i) => (i === settings.skill - 1 ? [] : t)) })
          }
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'won' in open && (
        <OutcomeDialog
          outcome="win"
          lines={['You matched them all!', `Time - ${open.won}`]}
          onOk={() => afterVictory(open.won)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <HighScoreDialog
          name={scores.playerName}
          onOk={(name) => {
            const tables = [...scores.tables];
            tables[settings.skill - 1] = insert(tables[settings.skill - 1]!, open.place, {
              name,
              score: open.highScore,
            });
            setScores({ tables, playerName: name });
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play CardMatch"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>Keyboard: F2 starts a new game. On a touch screen, tap the cards.</p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About CardMatch"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>CardMatch copyright © 1995 by The Code Zone.</p>
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
