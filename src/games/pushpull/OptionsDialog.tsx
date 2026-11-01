import { useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { AnimationTab, BoardTab, PiecesTab, SkillLevel } from '../../shell/czgame/OptionsTabs.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import type { Settings } from './settings.ts';

/** Game › Options (dialog 256): Options, Board, Pieces, Extras and Animation tabs. */
export function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="board-options">
      <SkillLevel value={draft.skill} onChange={(skill) => setDraft({ ...draft, skill })} />
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
  );

  return (
    <>
      <Dialog
        title="Push-Pull Options"
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
              label: '~Board',
              content: <BoardTab value={draft.board} onChange={(board) => setDraft({ ...draft, board })} />,
            },
            {
              label: '~Pieces',
              content: <PiecesTab value={draft.pieceSet} onChange={(pieceSet) => setDraft({ ...draft, pieceSet })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: <AnimationTab value={draft.speed} onChange={(speed) => setDraft({ ...draft, speed })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="Push-Pull"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
