import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import type { Skill } from './logic.ts';
import type { Settings } from './settings.ts';

const LEVELS: [Skill, string][] = [
  [1, 'Ea~sy'],
  [2, '~Moderate'],
  [3, '~Difficult'],
  [4, 'E~xpert'],
];

/** Game › Options (dialog 256): the skill level, then the sounds. */
export function OptionsDialog(props: { settings: Settings; onOk: (s: Settings) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(props.settings);

  const options = (
    <div className="crypto-options">
      <fieldset>
        <legend>Skill Level</legend>
        {LEVELS.map(([skill, label]) => (
          <label key={skill} className="radio">
            <input
              type="radio"
              name="skill"
              checked={draft.skill === skill}
              onChange={() => setDraft({ ...draft, skill })}
            />
            <span>
              <Label text={label} />
            </span>
          </label>
        ))}
      </fieldset>
      <div className="explanation">
        <p>
          In the Easy and Moderate skill levels, the phrases are broken up by the individual words. The Difficult and
          Expert skill levels don&apos;t break the words up, making the puzzles much more difficult.
        </p>
        <p>The Easy and Difficult skill levels use longer phrases, which are a bit easier to solve.</p>
      </div>
    </div>
  );

  return (
    <Dialog
      title="Cryptograms Options"
      className="options"
      buttons={[
        { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
        { label: 'Cancel', cancel: true, onClick: props.onCancel },
      ]}
    >
      <Notebook
        tabs={[
          { label: '~Options', content: options },
          {
            label: '~Extras',
            content: (
              <ExtrasTab value={draft} background={false} onChange={(extras) => setDraft({ ...draft, ...extras })} />
            ),
          },
        ]}
      />
    </Dialog>
  );
}
