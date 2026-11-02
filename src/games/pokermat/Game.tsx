import { useEffect, useState } from 'react';
import { CONFIRM_NEW, CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { BacksTab, FacesTab } from '../../shell/cards/OptionsTabs.tsx';
import { gameById } from '../../shell/catalog.ts';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { HallOfFame } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { placeOf, tableOf } from '../../shell/highscores.ts';
import { useHighScores } from '../../shell/useHighScores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Label, Window } from '../../shell/Window.tsx';
import { deal, isBroke, redeal, setBet, signIn, toggle, type State } from './logic.ts';
import { Machine } from './Machine.tsx';
import { loadSettings, saveSettings, TITLE, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'pokermat';
const INFO = gameById(ID)!;

type Open = 'sign-in' | 'new' | 'options' | 'broke' | 'high-scores' | 'rules' | 'about' | null;

export default function PokerMachine({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => signIn(settings.type));
  // FUN_0040cc60: the machine starts by asking for the player's name.
  const [open, setOpen] = useState<Open>('sign-in');

  // The three high score tables (final balances), by game type (kept with the settings before).
  const { scores, record: recordScore, clear: clearScores } = useHighScores(ID, ID);

  /** FUN_00401270: a final balance into the high score table of game `type`, under the signed-in name. */
  const recordBalance = (name: string, type: number, balance: number) => {
    const at = placeOf(tableOf(scores, type), balance);
    if (at >= 0) recordScore(type, at, name, balance);
  };
  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => playEvent(settings, event);

  // Leaving records the balance, even an empty one, as the original's destructor does.
  const close = useStartExit(TITLE, settings, onExit);
  const exit = () => {
    recordBalance(settings.playerName, settings.type, game.balance);
    close();
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
    if (game.balance !== 0) recordBalance(settings.playerName, settings.type, game.balance);
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

      {open === 'new' && <ConfirmBox title={TITLE} text={CONFIRM_NEW} onYes={newGame} onNo={() => setOpen(null)} />}

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={game.balance !== 0}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // The original switches game first, then records the balance: in the new game's table.
            setSettings(next);
            if (game.balance !== 0) recordBalance(settings.playerName, next.type, game.balance);
            setGame({ ...signIn(next.type, game.bet), fresh: game.fresh });
            setOpen(null);
          }}
        />
      )}

      {open === 'broke' && (
        <EndDialog title={TITLE} outcome="lose" lines={['You are broke!', '']} onOk={() => setOpen(null)} />
      )}

      {open === 'high-scores' && (
        <HallOfFame
          title="Hall of Fame"
          table={tableOf(scores, settings.type)}
          onClear={clearScores && (() => clearScores(settings.type))}
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Your balance is recorded in the high score table of the game when you leave, start a new game or change games. Keyboard: Enter presses Deal, F2 starts a new game."
        />
      )}

      {open === 'about' && <AboutDialog title={TITLE} onClose={() => setOpen(null)} />}
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
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
