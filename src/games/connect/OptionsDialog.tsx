import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { CONFIRM_OPTIONS, ConfirmBox } from '../reversi/shared/Boxes.tsx';
import { AnimationTab, BoardTab, Choice, PiecesTab, SkillLevel } from '../reversi/shared/OptionsTabs.tsx';
import { SoundsTab } from '../reversi/shared/SoundsTab.tsx';
import type { Settings } from './settings.ts';

/**
 * Game › Options (`FUN_00402860`, dialog 256): skill level and who goes first; board, pieces,
 * sounds (no background: the board fills the window), animation. OK restarts the game, after a
 * confirmation if one is in progress (`FUN_00402830`).
 */
export function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<Settings>) => setDraft({ ...draft, ...patch });

  const options = (
    <div className="board-options">
      <SkillLevel value={draft.skill} onChange={(skill) => set({ skill })} />
      <div className="choices">
        <Choice
          legend="Who Goes First"
          items={['Player Goes First', 'Computer Goes First']}
          value={draft.playerFirst ? 0 : 1}
          onChange={(i) => set({ playerFirst: i === 0 })}
        />
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        title="Checker Connector Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Board', content: <BoardTab value={draft.board} onChange={(board) => set({ board })} /> },
            {
              label: '~Pieces',
              content: <PiecesTab value={draft.pieceSet} onChange={(pieceSet) => set({ pieceSet })} />,
            },
            {
              label: '~Extras',
              content: <SoundsTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: <AnimationTab value={draft.animation} onChange={(animation) => set({ animation })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="Checker Connector"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
