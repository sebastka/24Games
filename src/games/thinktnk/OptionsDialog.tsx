import { useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { PlayerKeys } from '../../shell/PlayerKeys.tsx';
import type { Action, Settings } from './settings.ts';

/** The Player Keys, laid out as the original's dialog: up, then left, right and fire, then down. */
const KEY_ROWS: [Action, string][][] = [
  [['up', 'Tank Up']],
  [
    ['left', 'Tank Left'],
    ['right', 'Tank Right'],
    ['fire', 'Fire Gun'],
  ],
  [['down', 'Tank Down']],
];

/**
 * Game › Options (dialog 256, FUN_0040d190): the keys, background and sounds. OK during a game
 * first asks whether to restart it.
 */
export function OptionsDialog(props: {
  settings: Settings;
  playing: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const accept = () => (props.playing ? setConfirm(true) : props.onOk(draft));
  return (
    <>
      <Dialog
        title="Think Tank Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: accept },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            {
              label: '~Options',
              content: (
                <PlayerKeys
                  legend="Player Keys"
                  groups={KEY_ROWS}
                  keys={draft.keys}
                  onChange={(keys) => setDraft({ ...draft, keys })}
                />
              ),
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="Think Tank"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
