// Options › Extras of the games whose board fills the window (Checker Connector): only the
// "Game Sounds" group of the shell's ExtrasTab, which always offers a background too.
import { useState } from 'react';
import { ListBox } from '../../../shell/Dialog.tsx';
import type { Extras } from '../../../shell/ExtrasTab.tsx';
import { playSound, SOUND_NAMES } from '../../../shell/sound.ts';

export function SoundsTab({ value, onChange }: { value: Extras; onChange: (value: Extras) => void }) {
  const events = Object.keys(value.sounds);
  const [event, setEvent] = useState(0);
  const eventName = events[event] ?? '';
  const sound = value.sounds[eventName] ?? '';
  return (
    <div className="extras sounds-only">
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
