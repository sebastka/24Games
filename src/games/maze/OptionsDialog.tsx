import { useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { PlayerKeys } from '../../shell/PlayerKeys.tsx';
import { SIZES, type Action, type Keys, type Settings } from './settings.ts';

const SKILLS = ['1 Slow', '2', '3', '4', '5', '6', '7', '8', '9', '10 Fast'];
const WALLS = ['All Walls Visible', 'Some Walls Visible', 'No Walls Visible'];

/** The keys of a mouse, laid out as the original's Keys tab: up, then left and right, then down. */
const KEY_ROWS: [Action, string][][] = [
  [['up', 'Mouse Up']],
  [
    ['left', 'Mouse Left'],
    ['right', 'Mouse Right'],
  ],
  [['down', 'Mouse Down']],
];

/**
 * Game › Options (dialog 260, FUN_00404310): players and the computer's speed, walls and
 * throwers, the maze's size; the keys of both mice; the sounds. OK during a race first asks
 * whether to restart it.
 */
export function OptionsDialog(props: {
  settings: Settings;
  playing: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const accept = () => (props.playing ? setConfirm(true) : props.onOk(draft));
  const computer = draft.skill > 0;
  const setKeys = (i: 0 | 1, keys: Keys) => {
    const both = [...draft.keys] as [Keys, Keys];
    both[i] = keys;
    setDraft({ ...draft, keys: both });
  };
  const size = (label: string, value: number, set: (v: number) => void) => (
    <label className="maze-size">
      {label}
      <select value={value} onChange={(e) => set(Number(e.target.value))}>
        {SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const options = (
    <div className="maze-options">
      <fieldset className="players">
        <legend>Number of Players</legend>
        <div>
          <label className="check">
            <input
              type="radio"
              name="players"
              checked={computer}
              onChange={() => setDraft({ ...draft, skill: draft.skill || 3 })}
            />
            1 Player - Skill
          </label>
          <label className="check">
            <input type="radio" name="players" checked={!computer} onChange={() => setDraft({ ...draft, skill: 0 })} />2
            Players
          </label>
        </div>
        <ListBox
          label="Skill"
          items={SKILLS}
          selected={Math.max(0, draft.skill - 1)}
          onSelect={(i) => setDraft({ ...draft, skill: i + 1 })}
          rows={5}
          disabled={!computer}
        />
      </fieldset>
      <fieldset>
        <legend>Walls</legend>
        <ListBox
          label="Walls"
          items={WALLS}
          selected={draft.visibility}
          onSelect={(visibility) => setDraft({ ...draft, visibility })}
          rows={3}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={draft.playerThrowers}
            onChange={(e) => setDraft({ ...draft, playerThrowers: e.target.checked })}
          />
          Player Throwers
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.opponentThrowers}
            onChange={(e) => setDraft({ ...draft, opponentThrowers: e.target.checked })}
          />
          Opponent Throwers
        </label>
      </fieldset>
      <fieldset>
        <legend>Maze</legend>
        {size('Maze Width', draft.width, (width) => setDraft({ ...draft, width }))}
        {size('Maze Height', draft.height, (height) => setDraft({ ...draft, height }))}
      </fieldset>
    </div>
  );

  const keys = (
    <div className="maze-keys">
      <PlayerKeys
        legend="White Mouse Keys (player 1)"
        groups={KEY_ROWS}
        keys={draft.keys[0]}
        onChange={(k) => setKeys(0, k)}
      />
      <PlayerKeys
        legend="Brown Mouse Keys (player 2)"
        groups={KEY_ROWS}
        keys={draft.keys[1]}
        onChange={(k) => setKeys(1, k)}
        disabled={computer}
      />
    </div>
  );

  return (
    <>
      <Dialog
        title="MazeRace Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: accept },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Keys', content: keys },
            {
              label: '~Extras',
              content: (
                <ExtrasTab value={draft} background={false} onChange={(extras) => setDraft({ ...draft, ...extras })} />
              ),
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="MazeRace"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
