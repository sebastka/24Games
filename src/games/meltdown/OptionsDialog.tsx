import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { CONFIRM_OPTIONS, ConfirmBox } from '../reversi/shared/Boxes.tsx';
import { AnimationTab, BoardTab, PiecesTab, SkillLevel } from '../reversi/shared/OptionsTabs.tsx';
import type { Settings } from './settings.ts';

const SIZES = ['5 X 5', '6 X 6', '7 X 7'];

/**
 * Game › Options (`FUN_004040b0`, dialog 256): skill level, board size and first player; board,
 * pieces, extras, animation. OK restarts the game, after a confirmation if one is in progress
 * (`FUN_00404080`).
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
        <fieldset className="choice size">
          <legend>Board Size</legend>
          <label>
            Width and Height{' '}
            <select value={draft.boardSize - 5} onChange={(e) => set({ boardSize: Number(e.target.value) + 5 })}>
              {SIZES.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset className="choice">
          <legend>First Player</legend>
          <select
            aria-label="First Player"
            value={draft.playerFirst ? 0 : 1}
            onChange={(e) => set({ playerFirst: e.target.value === '0' })}
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
        title="Core Meltdown Options"
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
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
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
          title="Core Meltdown"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
