import { KEY_NAMES } from './keys.ts';

/**
 * The "Player Keys" of the arcade games' options: a drop-down list of the original's key names
 * per action, laid out as the original dialogs (up, then left / right / extra, then down).
 */
export function PlayerKeys<A extends string>(props: {
  legend: string;
  rows: [A, string][][];
  keys: Record<A, string>;
  onChange: (keys: Record<A, string>) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="player-keys" disabled={props.disabled}>
      <legend>{props.legend}</legend>
      {props.rows.map((row, r) => (
        <div key={r} className="key-row">
          {row.map(([action, label]) => (
            <label key={action} className="key-choice">
              {label}
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
