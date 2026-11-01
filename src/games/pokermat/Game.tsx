import { useEffect, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/cards/EndDialog.tsx';
import { HallOfFame } from '../../shell/cards/HighScores.tsx';
import { BacksTab, FacesTab } from '../../shell/cards/OptionsTabs.tsx';
import { insertScore, placeOf } from '../../shell/cards/scores.ts';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Label, Window } from '../../shell/Window.tsx';
import { deal, isBroke, redeal, setBet, signIn, toggle, type State } from './logic.ts';
import { Machine } from './Machine.tsx';
import { loadSettings, saveSettings, TITLE, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('pokermat')!;

type Open = 'sign-in' | 'new' | 'options' | 'broke' | 'high-scores' | 'rules' | 'about' | null;

/** FUN_00401270: a final balance into a high score table, under the signed-in name. */
function record(settings: Settings, table: number, balance: number): Settings {
  const scores = [...settings.scores];
  const at = placeOf(scores[table] ?? [], balance);
  if (at === null) return settings;
  scores[table] = insertScore(scores[table] ?? [], at, { name: settings.playerName, score: balance });
  return { ...settings, scores };
}

export default function PokerMachine({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => signIn(settings.type));
  // FUN_0040cc60: the machine starts by asking for the player's name.
  const [open, setOpen] = useState<Open>('sign-in');

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  useEffect(() => {
    sound(`${TITLE} Start`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving records the balance, even an empty one, as the original's destructor does.
  const exit = () => {
    saveSettings(record(settings, settings.type, game.balance));
    sound(`${TITLE} Exit`);
    onExit();
  };

  /** The Deal button (FUN_0040c250): deal, or redeal and pay. */
  const press = () => {
    if (game.phase === 'draw') {
      const next = redeal(game);
      setGame(next);
      if (next.payline !== null) sound('Jackpot');
      if (isBroke(next)) {
        sound('You are Broke');
        setOpen('broke');
      }
      return;
    }
    const next = deal(game, Math.random);
    if (!next) return beep();
    sound('Deal Cards');
    setGame(next);
  };

  const flip = (i: number) => {
    const next = toggle(game, i);
    if (!next) return beep();
    sound(next.held[i] ? 'Flip Card - Front' : 'Flip Card - Back');
    setGame(next);
  };

  const bet = (n: number) => {
    const next = setBet(game, n);
    if (!next) return beep();
    sound('Change Bet');
    setGame(next);
  };

  /** Game › New (FUN_0040cf60, item 11): the balance recorded, then a new sign-in. */
  const newGame = () => {
    if (game.balance !== 0) setSettings(record(settings, settings.type, game.balance));
    setOpen('sign-in');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      if (game.balance !== 0) setOpen('new');
      else newGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Window
      title={settings.playerName ? `${TITLE} - ${settings.playerName}` : TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game pokermat"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: () => (game.balance !== 0 ? setOpen('new') : newGame()) },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('high-scores') },
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
      <Machine state={game} look={settings} background={settings.background} onDeal={press} onCard={flip} onBet={bet} />

      {open === 'sign-in' && (
        <SignIn
          name={settings.playerName}
          onOk={(playerName) => {
            setSettings({ ...settings, playerName });
            setGame(signIn(settings.type, game.bet));
            setOpen(null);
          }}
        />
      )}

      {open === 'new' && (
        <Dialog
          title={TITLE}
          buttons={[
            { label: '~Yes', primary: true, onClick: newGame },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={game.balance !== 0}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // The original switches game first, then records the balance: in the new game's table.
            setSettings(game.balance !== 0 ? record(next, next.type, game.balance) : next);
            setGame({ ...signIn(next.type, game.bet), fresh: game.fresh });
            setOpen(null);
          }}
        />
      )}

      {open === 'broke' && (
        <EndDialog title={TITLE} outcome="lose" lines={['You are broke!', '']} onClose={() => setOpen(null)} />
      )}

      {open === 'high-scores' && (
        <HallOfFame
          title={TITLE}
          table={settings.scores[settings.type] ?? []}
          onClear={() => {
            const scores = [...settings.scores];
            scores[settings.type] = [];
            setSettings({ ...settings, scores });
          }}
          onClose={() => setOpen(null)}
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
              Your balance is recorded in the high score table of the game when you leave, start a new game or change
              games. Keyboard: Enter presses Deal, F2 starts a new game.
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

/** "Please Sign In" (pokermat.exe dialog 257): the name for the high score tables. */
function SignIn(props: { name: string; onOk: (name: string) => void }) {
  const [name, setName] = useState(props.name);
  return (
    <Dialog
      title="Please Sign In"
      className="sign-in"
      buttons={[{ label: 'OK', primary: true, onClick: () => props.onOk(name.trim()) }]}
    >
      <p className="welcome">Welcome to the Casino!</p>
      <p className="provided">
        You will be provided with $100 to play.
        <br />
        Please enter your name below.
      </p>
      <input
        type="text"
        aria-label="Your name"
        maxLength={30}
        autoComplete="nickname"
        value={name}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setName(e.target.value)}
      />
    </Dialog>
  );
}

const GAMES = ['~Straight Poker', '~Jokers Wild', '~Deuces Wild'];

/** Game › Options: OK starts over with $100, after a confirmation while there is money left. */
function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const options = (
    <div className="card-tab">
      <fieldset className="game-to-play">
        <legend>Game To Play</legend>
        {GAMES.map((label, type) => (
          <label key={label} className="check">
            <input
              type="radio"
              name="game-type"
              checked={draft.type === type}
              onChange={() => setDraft({ ...draft, type })}
            />
            <span>
              <Label text={label} />
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
  return (
    <>
      <Dialog
        title={`${TITLE} Options`}
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            {
              label: '~Faces',
              content: <FacesTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Backs',
              content: <BacksTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <Dialog
          title={TITLE}
          buttons={[
            { label: '~Yes', primary: true, onClick: () => props.onOk(draft) },
            { label: '~No', cancel: true, onClick: () => setConfirm(false) },
          ]}
        >
          <p className="message warning">
            Changing the game options will restart the game in progress. Are you sure you want to do this?
          </p>
        </Dialog>
      )}
    </>
  );
}
