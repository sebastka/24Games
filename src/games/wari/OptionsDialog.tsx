import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { AnimationTab, ConfirmRestart, PiecesTab, SkillLevel } from './czgame.tsx';
import type { Settings } from './settings.ts';

const PER_PIT = ['1', '2', '3', '4', '5', '6', 'Random'];

/** Game › Options (dialog 256): Options, Pieces, Extras and Animation tabs. */
export function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="wari-options">
      <SkillLevel skill={draft.skill} onChange={(skill) => setDraft({ ...draft, skill })} />
      <div className="wari-lists">
        <fieldset>
          <legend>Pieces Per Cell</legend>
          <select
            aria-label="Pieces per cell"
            value={draft.perPit === 0 ? 6 : draft.perPit - 1}
            onChange={(e) => {
              const i = Number(e.target.value);
              setDraft({ ...draft, perPit: i === 6 ? 0 : i + 1 });
            }}
          >
            {PER_PIT.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset>
          <legend>Who Goes First</legend>
          <select
            aria-label="Who goes first"
            value={draft.playerFirst ? 0 : 1}
            onChange={(e) => setDraft({ ...draft, playerFirst: e.target.value === '0' })}
          >
            <option value={0}>Player Goes First</option>
            <option value={1}>Computer Goes First</option>
          </select>
        </fieldset>
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        title="Wari Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            {
              label: '~Pieces',
              content: (
                <PiecesTab
                  pieceSet={draft.pieceSet}
                  twoPieces={false}
                  onChange={(pieceSet) => setDraft({ ...draft, pieceSet })}
                />
              ),
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: <AnimationTab speed={draft.speed} onChange={(speed) => setDraft({ ...draft, speed })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && <ConfirmRestart title="Wari" onYes={() => props.onOk(draft)} onNo={() => setConfirm(false)} />}
    </>
  );
}
