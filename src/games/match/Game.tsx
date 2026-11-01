import { useEffect, useRef, useState } from 'react';
import aliens from '../../assets/match/aliens.png';
import back from '../../assets/match/back.png';
import cards from '../../assets/match/cards.png';
import found from '../../assets/match/found.png';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { backgroundStyle } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf, type HighScores } from '../../shell/highscores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
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
  const [scores, setScores] = useState<HighScores>(() => loadScores('match'));
  const [open, setOpen] = useState<Open>(null);
  const [hidden, setHidden] = useState(() => document.hidden);
  // Whether the clock was paused by a dialog (or a hidden tab), to be resumed after it.
  const held = useRef(false);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('match', scores), [scores]);

  const sound = (event: SoundEvent | null) => {
    if (event) playEvent(settings, event);
  };

  const exit = useStartExit(TITLE, settings, onExit);

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
    // Times: lower is better.
    const place = placeOf(tableOf(scores, settings.skill - 1), time, true);
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
      <div className="playfield" style={backgroundStyle(settings.background)}>
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
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_NEW}
          onYes={() => {
            newGame();
            setOpen(null);
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame - ${level}`}
          table={tableOf(scores, settings.skill - 1)}
          onClear={() => setScores(cleared(scores, settings.skill - 1))}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'won' in open && (
        <EndDialog
          title={TITLE}
          outcome="win"
          lines={['You matched them all!', `Time - ${open.won}`]}
          onOk={() => afterVictory(open.won)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, settings.skill - 1, open.place, name, open.highScore));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="CardMatch"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard: F2 starts a new game. On a touch screen, tap the cards."
        />
      )}

      {open === 'about' && <AboutDialog title="CardMatch" onClose={() => setOpen(null)} />}
    </Window>
  );
}
