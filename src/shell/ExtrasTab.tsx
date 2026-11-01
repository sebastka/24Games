import { useState } from 'react';
import { BACKGROUNDS } from './backgrounds.ts';
import { ListBox } from './Dialog.tsx';
import { playSound, SOUND_NAMES } from './sound.ts';

export interface Extras {
  /** Index in BACKGROUNDS. */
  background: number;
  soundEnabled: boolean;
  /** Sound name (a WAV of the CD, without extension) per event; '' for none. */
  sounds: Record<string, string>;
}

/** Options › Extras, common to all games: window background and sounds. */
export function ExtrasTab({ value, onChange }: { value: Extras; onChange: (value: Extras) => void }) {
  const events = Object.keys(value.sounds);
  const [event, setEvent] = useState(0);
  const eventName = events[event] ?? '';
  const sound = value.sounds[eventName] ?? '';

  return (
    <div className="extras">
      <fieldset>
        <legend>Background</legend>
        <ListBox
          label="Background"
          items={BACKGROUNDS.map((b) => b.name)}
          selected={value.background}
          onSelect={(background) => onChange({ ...value, background })}
          rows={7}
        />
      </fieldset>
      <fieldset>
        <legend>Sounds</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={value.soundEnabled}
            onChange={(e) => onChange({ ...value, soundEnabled: e.target.checked })}
          />
          Sound enabled
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
            Play
          </button>
        </div>
      </fieldset>
    </div>
  );
}
