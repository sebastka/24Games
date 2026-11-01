import { useState } from 'react';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { AnimationTab } from '../pegoplis/AnimationTab.tsx';
import { BoardPreview } from '../quinto/Previews.tsx';
import { BOARD_SETS } from '../quinto/sets.ts';
import type { Settings } from './settings.ts';

/** Game › Options (dialog 256, `FUN_00403784`): board, extras, animation. */
export function OptionsDialog(props: { settings: Settings; onOk: (s: Settings) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(props.settings);
  return (
    <Dialog
      title="Black Box Chess Options"
      className="options"
      buttons={[
        { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
        { label: 'Cancel', cancel: true, onClick: props.onCancel },
      ]}
    >
      <Notebook
        tabs={[
          {
            label: '~Board',
            content: (
              <div className="pieces bbchess-board">
                <fieldset>
                  <legend>Board Names</legend>
                  <ListBox
                    label="Board names"
                    items={BOARD_SETS}
                    selected={draft.boardSet}
                    onSelect={(boardSet) => setDraft({ ...draft, boardSet })}
                    rows={7}
                  />
                </fieldset>
                <fieldset>
                  <legend>Board Preview</legend>
                  <BoardPreview set={draft.boardSet} />
                </fieldset>
              </div>
            ),
          },
          {
            label: '~Extras',
            content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
          },
          {
            label: '~Animation',
            content: <AnimationTab value={draft} onChange={(a) => setDraft({ ...draft, ...a })} />,
          },
        ]}
      />
    </Dialog>
  );
}
