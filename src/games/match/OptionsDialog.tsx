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
];

/** Game › Options (dialog 256): the skill level, then background and sounds. */
export function OptionsDialog(props: { settings: Settings; onOk: (s: Settings) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(props.settings);

  const options = (
    <div className="match-options">
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
        <p>The Easy skill level uses a grid of 16 cards.</p>
        <p>The Moderate skill level uses a grid of 36 cards, making match-finding more difficult.</p>
        <p>
          The difficult skill level (Space Alien Mode) uses a grid of 36 cards, but the cards are a bit less
          &apos;unique&apos;. Try it!
        </p>
      </div>
    </div>
  );

  return (
    <Dialog
      title="CardMatch Options"
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
            content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
          },
        ]}
      />
    </Dialog>
  );
}
