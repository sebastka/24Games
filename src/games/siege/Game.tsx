import { useEffect, useState } from 'react';
import { CONFIRM_NEW, CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { AnimationTab, FacesTab } from '../../shell/cards/OptionsTabs.tsx';
import { gameById } from '../../shell/catalog.ts';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { playEvent, useStartExit } from '../../shell/sound.ts';
import { Label, Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { canClaim, canUndo, claim, deal, foundationFor, isFoundation, move, undo, type State } from './logic.ts';
import { loadSettings, saveSettings, TITLE, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('siege')!;

type Open = 'options' | 'new' | 'rules' | 'about' | { won: [string, string] } | null;

export default function Siege({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal(settings.acesPlaced, Math.random));
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => playEvent(settings, event);

  const exit = useStartExit(TITLE, settings, onExit);
  useEffect(() => {
    sound('Deal Cards');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newGame = (s: Settings = settings) => {
    setGame(deal(s.acesPlaced, Math.random));
    sound('Deal Cards');
    setOpen(null);
  };

  /** FUN_00409f70: a card moved; when the wings are empty, "You played all of the cards!". */
  const play = (from: number, to: number) => {
    const next = move(game, from, to);
    setGame(next);
    sound(isFoundation(to) ? 'Drop to Foundation' : 'Drop to Tableau');
    if (!next.playing) {
      sound('Victory');
      setOpen({ won: ['You played all', 'of the cards!'] });
    }
  };

  const undoLast = () => canUndo(game) && setGame(undo(game));
  const claimGame = () => {
    setGame(claim(game));
    sound('Victory');
    setOpen({ won: ['You successfully', 'claimed the game!'] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        if (game.playing) setOpen('new');
        else newGame();
      } else if (e.key === 'z' && e.ctrlKey) undoLast();
      else return;
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
      className="game siege"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: () => (game.playing ? setOpen('new') : newGame()) },
            { label: '~Undo Last Move', shortcut: 'Ctrl+Z', disabled: !canUndo(game), onSelect: undoLast },
            { label: '~Claim', disabled: !canClaim(game), onSelect: claimGame },
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
      <Board
        state={game}
        look={settings}
        drag={settings}
        background={settings.background}
        onDragStart={() => sound('Drag Card')}
        onMove={play}
        onDoubleClick={(pile) => {
          const to = foundationFor(game, pile);
          if (to === null) return false;
          play(pile, to);
          return true;
        }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={game.playing}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            setSettings(next);
            newGame(next);
          }}
        />
      )}

      {open === 'new' && (
        <ConfirmBox title={TITLE} text={CONFIRM_NEW} onYes={() => newGame()} onNo={() => setOpen(null)} />
      )}

      {open !== null && typeof open === 'object' && (
        <EndDialog title={TITLE} outcome="win" lines={open.won} onOk={() => setOpen(null)} />
      )}

      {open === 'rules' && (
        <RulesDialog
          title={TITLE}
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Drag the top card of a wing pile onto a card one rank higher, onto an empty pile, or onto its foundation. Double-click (or double-tap) a card to send it to its foundation. When every wing pile is in descending order, Game › Claim ends the game. Keyboard: F2 starts a new game, Ctrl+Z undoes the last move."
        />
      )}

      {open === 'about' && <AboutDialog title={TITLE} onClose={() => setOpen(null)} />}
    </Window>
  );
}

const ANIMATION_LABELS = ['~Drag Cards', 'D~rag Outlines', '~Show Drag Zones', 'S~how Drop Zones'];

/** Game › Options: OK restarts the game, after a confirmation if one is in progress. */
function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const radio = (label: string, acesPlaced: boolean) => (
    <label className="check">
      <input
        type="radio"
        name="aces"
        checked={draft.acesPlaced === acesPlaced}
        onChange={() => setDraft({ ...draft, acesPlaced })}
      />
      <span>
        <Label text={label} />
      </span>
    </label>
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
            {
              label: '~Options',
              content: (
                <div className="card-tab">
                  <fieldset className="foundations">
                    <legend>Foundations</legend>
                    {radio('~Place Aces on Foundations', true)}
                    {radio('P~lace Aces in Tableau', false)}
                  </fieldset>
                </div>
              ),
            },
            {
              label: '~Faces',
              content: <FacesTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: (
                <AnimationTab
                  value={draft}
                  labels={ANIMATION_LABELS}
                  onChange={(drag) => setDraft({ ...draft, ...drag })}
                />
              ),
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
