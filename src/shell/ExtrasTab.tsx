import { useState } from 'react';
import { BACKGROUNDS } from './backgrounds.ts';
import { ListBox } from './Dialog.tsx';
import { playSound, SOUND_NAMES } from './sound.ts';
import type { SoundSettings } from './soundEvents.ts';

export interface Extras extends SoundSettings {
  /** Index in BACKGROUNDS. */
  background: number;
}

/**
 * Options › Extras, common to all games (CZGAME32.DLL): the window background and the sounds.
 * `background` false leaves only the sounds, for the games whose play field fills the window
 * (Checker Connector, Cryptograms, MazeRace).
 */
export function ExtrasTab<T extends SoundSettings>(props: {
  value: T;
  onChange: (value: T) => void;
  /** Offer the background list (true by default; the value must then have `background`). */
  background?: boolean;
}) {
  const { value, onChange } = props;
  const events = Object.keys(value.sounds);
  const [event, setEvent] = useState(0);
  const eventName = events[event] ?? '';
  const sound = value.sounds[eventName] ?? '';
  const withBackground = props.background ?? true;

  return (
    <div className={withBackground ? 'extras' : 'extras sounds-only'}>
      {withBackground && 'background' in value && typeof value.background === 'number' && (
        <fieldset>
          <legend>Screen Background</legend>
          <ListBox
            label="Screen background"
            items={BACKGROUNDS.map((b) => b.name)}
            selected={value.background}
            onSelect={(background) => onChange({ ...value, background })}
            rows={7}
          />
        </fieldset>
      )}
      <fieldset>
        <legend>Game Sounds</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={value.soundEnabled}
            onChange={(e) => onChange({ ...value, soundEnabled: e.target.checked })}
          />
          Game Sounds Enabled
        </label>
        <ListBox label="Sound events" items={events} selected={event} onSelect={setEvent} rows={4} />
        <div className="sound-choice">
          <select
            aria-label={`Sound for ${eventName}`}
            value={sound}
            disabled={!value.soundEnabled}
            onChange={(e) => onChange({ ...value, sounds: { ...value.sounds, [eventName]: e.target.value } })}
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
