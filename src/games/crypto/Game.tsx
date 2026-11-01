import { useEffect, useState } from 'react';
import file1 from '../../assets/crypto/phrases1.json';
import file2 from '../../assets/crypto/phrases2.json';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { OutcomeDialog } from '../match/Dialogs.tsx';
import { Board, LetterPad } from './Board.tsx';
import {
  end,
  giveUp,
  hint,
  hintText,
  isSolved,
  newGame,
  phraseFileOf,
  select,
  type,
  type PhraseFile,
  type Skill,
  type State,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('crypto')!;
const TITLE = 'Cryptograms';
const FILES: Record<1 | 2, PhraseFile> = { 1: file1 as PhraseFile, 2: file2 as PhraseFile };

const deal = (skill: Skill) => newGame(FILES[phraseFileOf(skill)], skill);

type Open = 'options' | 'rules' | 'about' | 'abandon' | { restart: Settings } | { solved: number } | 'gaveUp' | null;

export default function Cryptograms({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal(settings.skill));
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => saveSettings(settings), [settings]);

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

  /** After a letter or a hint: the victory (`FUN_00401bb0`), with its sound. */
  const check = (state: State) => {
    if (!isSolved(state)) {
      setGame(state);
      return;
    }
    setGame(end(state));
    setOpen({ solved: state.hints });
    sound(state.hints === 0 ? 'Victory -No Hints' : 'Victory');
  };

  const press = (key: string) => {
    if (open) return;
    const next = type(game, key);
    if (!next) return;
    sound('Change a Letter');
    check(next);
  };

  const click = (i: number) => {
    if (open) return;
    const { state, event } = select(game, i);
    if (event === 'beep') beep();
    if (event === 'select') sound('Click a Cell');
    setGame(state);
  };

  const askHint = () => {
    sound('Hint');
    if (game.active) check({ ...hint(game), hints: game.hints + 1 });
  };

  const surrender = () => {
    // Like the original, even after the puzzle is solved.
    setGame(giveUp(game));
    setOpen('gaveUp');
    sound('Defeat');
  };

  const askNew = () => (game.active ? setOpen('abandon') : setGame(deal(settings.skill)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'F2') askNew();
      else if (e.key.length === 1) press(e.key);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const apply = (next: Settings) => {
    setSettings(next);
    setGame(deal(next.skill));
    setOpen(null);
  };

  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game crypto"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: '~Hint', onSelect: askHint },
            { label: '~Give up', onSelect: surrender },
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
      <Board state={game} onSelect={click} />
      <LetterPad onKey={press} disabled={!game.active} />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          onCancel={() => setOpen(null)}
          // A game in progress is restarted only on confirmation.
          onOk={(next) => (game.active ? setOpen({ restart: next }) : apply(next))}
        />
      )}

      {open !== null && typeof open === 'object' && 'restart' in open && (
        <Dialog
          title={TITLE}
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
          title={TITLE}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setGame(deal(settings.skill));
                setOpen(null);
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open !== null && typeof open === 'object' && 'solved' in open && (
        <OutcomeDialog
          outcome="win"
          lines={['You solved the puzzle', hintText(open.solved)]}
          onOk={() => setOpen(null)}
        />
      )}

      {open === 'gaveUp' && <OutcomeDialog outcome="lose" lines={['You Gave Up!']} onOk={() => setOpen(null)} />}

      {open === 'rules' && (
        <Dialog
          title="How to Play Cryptograms"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Keyboard: type a letter to put it in the selected boxes, Space to clear them, F2 for a new phrase. On a
              touch screen, tap a box, then a letter below the puzzle.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Cryptograms"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Cryptograms copyright © 1995 by The Code Zone.</p>
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
