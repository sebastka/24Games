// Options › Keys of the arcade games: a drop-down list of the original's 68 key names per action.
import { KEY_NAMES } from './keys.ts';
import './player-keys.css';

/**
 * The keys of one player, in groups laid out as the original's dialog: rows (Cheesy Pursuit,
 * MazeRace, Think Tank: up, then left / right / extra, then down; the name above each list) or
 * columns (StackBlitz: moves and drop, then the rotations; the name beside each list).
 */
export function PlayerKeys<A extends string>(props: {
  legend: string;
  groups: [A, string][][];
  keys: Record<A, string>;
  onChange: (keys: Record<A, string>) => void;
  layout?: 'rows' | 'columns';
  disabled?: boolean;
}) {
  const layout = props.layout ?? 'rows';
  return (
    <fieldset className={`player-keys ${layout}`} disabled={props.disabled}>
      <legend>{props.legend}</legend>
      {props.groups.map((group, g) => (
        <div key={g} className="key-group">
          {group.map(([action, label]) => (
            <label key={action} className="key-choice">
              <span>{label}</span>
              <select
                value={props.keys[action]}
                onChange={(e) => props.onChange({ ...props.keys, [action]: e.target.value })}
              >
                {KEY_NAMES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ))}
    </fieldset>
  );
}
