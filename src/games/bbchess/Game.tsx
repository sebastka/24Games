import { useEffect, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { HallOfFameDialog, HighScoreDialog, OutcomeDialog } from '../match/Dialogs.tsx';
import { insert, loadScores, placeOf, saveScores, type Scores } from '../match/hallOfFame.ts';
import { Board, type Press } from './Board.tsx';
import { canGuess, deal, giveUp, guess, place, reveal, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('bbchess')!;
const TITLE = 'Black Box Chess';

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'abandon'
  | 'badGuess'
  | 'won'
  | { restart: Settings }
  | { highScore: string; place: number }
  | null;

export default function BlackBoxChess({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal());
  // After Give Up the title loses its score (FUN_00401aae).
  const [gaveUp, setGaveUp] = useState(false);
  const [scores, setScores] = useState<Scores>(() => loadScores('bbchess', 1));
  const [open, setOpen] = useState<Open>(null);
  const title = gaveUp ? TITLE : `${TITLE} Score - ${game.score}`;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('bbchess', scores), [scores]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
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

  const newGame = () => {
    setGame(deal());
    setGaveUp(false);
  };

  const askGuess = () => {
    if (!canGuess(game)) {
      beep();
      return;
    }
    const result = guess(game);
    setGame(result.state);
    if (result.right) {
      setOpen('won');
      sound('Victory');
    } else {
      setOpen('badGuess');
      sound('Bad Guess');
    }
  };

  const surrender = () => {
    if (!game.active) return;
    setGame(giveUp(game));
    setGaveUp(true);
    sound('Give Up');
  };

  const press = (p: Press) => {
    if (open) return;
    if (!game.active) {
      beep();
      return;
    }
    if (p.kind === 'guess') askGuess();
    else if (p.kind === 'giveUp') surrender();
    else if (p.kind === 'square') {
      const next = reveal(game, p.at);
      if (next) {
        setGame(next);
        sound('Click Board Square');
      }
    } else beep();
  };

  const askNew = () => (game.active ? setOpen('abandon') : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === 'F2') askNew();
      else if (e.key === 'Enter' && canGuess(game)) askGuess();
      else if (e.key.toLowerCase() === 'g' && e.ctrlKey) surrender();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const apply = (next: Settings) => {
    setSettings(next);
    newGame();
    setOpen(null);
  };

  const afterVictory = () => {
    const score = String(game.score);
    const place = placeOf(scores.tables[0]!, score, true);
    setOpen(place >= 0 ? { highScore: score, place } : null);
  };

  const background = BACKGROUNDS[settings.background];
  return (
    <Window
      title={title}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game bbchess"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: '~High Scores...', onSelect: () => setOpen('scores') },
            { separator: true },
            { label: '~Guess', shortcut: 'Return', disabled: !canGuess(game), onSelect: askGuess },
            { label: 'Give ~Up', shortcut: 'Ctrl+G', disabled: !game.active, onSelect: surrender },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
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
        <Board
          state={game}
          boardSet={settings.boardSet}
          dragBitmaps={settings.dragBitmaps}
          showDragZones={settings.showDragZones}
          showDropZones={settings.showDropZones}
          onPress={press}
          onDragStart={() => sound('Piece Drag')}
          onDrop={(piece, to, ok) => {
            // A drop outside the zones puts the piece back, silently (FUN_00403166).
            if (!ok) return;
            setGame(place(game, piece, to));
            sound('Piece Drop');
          }}
        />
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          onCancel={() => setOpen(null)}
          onOk={(next) => (game.active ? setOpen({ restart: next }) : apply(next))}
        />
      )}

      {open !== null && typeof open === 'object' && 'restart' in open && (
        <Dialog
          title={title}
          buttons={[
            { label: '~Yes', primary: true, onClick: () => apply(open.restart) },
            { label: '~No', cancel: true, onClick: () => setOpen('options') },
          ]}
        >
          <p className="message warning">
            Changing the game options will restart the game in progress. Are you sure you want to do this?
          </p>
        </Dialog>
      )}

      {open === 'abandon' && (
        <Dialog
          title={title}
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

      {open === 'badGuess' && (
        <Dialog title={title} buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}>
          <p className="message info">Sorry, you haven&apos;t guessed the sequence yet. Keep trying!</p>
        </Dialog>
      )}

      {open === 'won' && (
        <OutcomeDialog outcome="win" lines={['You have correctly', 'guessed the position.']} onOk={afterVictory} />
      )}

      {open === 'scores' && (
        <HallOfFameDialog
          title="Hall of Fame"
          table={scores.tables[0]!}
          onClear={() => setScores({ ...scores, tables: [[]] })}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <HighScoreDialog
          name={scores.playerName}
          onOk={(name) => {
            setScores({
              tables: [insert(scores.tables[0]!, open.place, { name, score: open.highScore })],
              playerName: name,
            });
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Black Box Chess"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Keyboard: Enter to guess, Ctrl+G to give up, F2 for a new game. On a touch screen, tap the squares and
              drag the pieces with a finger.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Black Box Chess"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Black Box Chess copyright © 1995 by The Code Zone.</p>
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
