import { useState } from 'react';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { playSound, SOUND_NAMES } from '../../shell/sound.ts';
import { PlayerKeys } from '../cheesy/common/PlayerKeys.tsx';
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

/** MazeRace's Extras tab: only the sounds (the game has no background option). */
function SoundsTab(props: {
  value: { soundEnabled: boolean; sounds: Record<string, string> };
  onChange: (v: { soundEnabled: boolean; sounds: Record<string, string> }) => void;
}) {
  const { value } = props;
  const events = Object.keys(value.sounds);
  const [event, setEvent] = useState(0);
  const eventName = events[event] ?? '';
  const sound = value.sounds[eventName] ?? '';
  return (
    <div className="extras">
      <fieldset>
        <legend>Game Sounds</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={value.soundEnabled}
            onChange={(e) => props.onChange({ ...value, soundEnabled: e.target.checked })}
          />
          Game Sounds Enabled
        </label>
        <ListBox label="Sound events" items={events} selected={event} onSelect={setEvent} rows={4} />
        <div className="sound-choice">
          <select
            aria-label={`Sound for ${eventName}`}
            value={sound}
            disabled={!value.soundEnabled}
            onChange={(e) => props.onChange({ ...value, sounds: { ...value.sounds, [eventName]: e.target.value } })}
          >
            <option value="">(none)</option>
            {SOUND_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="button" disabled={!sound || !value.soundEnabled} onClick={() => playSound(sound)}>
            Test
          </button>
        </div>
      </fieldset>
    </div>
  );
}

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
    <label className="key-choice">
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
        <div aria-disabled={!computer} style={computer ? undefined : { opacity: 0.5, pointerEvents: 'none' }}>
          <ListBox
            label="Skill"
            items={SKILLS}
            selected={Math.max(0, draft.skill - 1)}
            onSelect={(i) => setDraft({ ...draft, skill: i + 1 })}
            rows={5}
          />
        </div>
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
        rows={KEY_ROWS}
        keys={draft.keys[0]}
        onChange={(k) => setKeys(0, k)}
      />
      <PlayerKeys
        legend="Brown Mouse Keys (player 2)"
        rows={KEY_ROWS}
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
              content: <SoundsTab value={draft} onChange={(v) => setDraft({ ...draft, ...v })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <Dialog
          title="MazeRace"
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
