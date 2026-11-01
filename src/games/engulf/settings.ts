import { defaults, loadSettings, saveSettings, type BoardSettings } from '../../shell/czgame/settings.ts';
import { soundEvents } from '../../shell/soundEvents.ts';
import { LAYOUTS, type Progression } from './progress.ts';

export { LAYOUTS, type Progression };

/** Sound events, with the original's defaults (engulf.exe registers them at start). */
export const SOUND_EVENTS = soundEvents('Engulf', {
  'Piece Drag': 'click_5',
  'Piece Drop': 'click_4',
  'Enemy Piece Move': 'boing_3',
  'Piece Capture': 'drum_2',
  Victory: 'orch_2',
  Defeat: 'laugh_1',
  Tie: 'stopwach',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends BoardSettings {
  /** Registry PlayerGoesFirst (default yes). */
  playerFirst: boolean;
  progression: Progression;
  /**
   * Registry StartingBoard: the layout (0-34) the next new game steps from. With Sequential, the
   * original stores the current board and steps back one on the next launch, so that it replays.
   */
  startingBoard: number;
  /** Registry DragBitmaps: drag the piece itself (default), or only its outline. */
  dragBitmaps: boolean;
  /** Registry ShowDragZones, ShowDropZones (default off): highlight under the pointer. */
  showDragZones: boolean;
  showDropZones: boolean;
}

/** Help id 2915: Blue Swirl background, Purple & Gold board, Happies/Angries; speed 3. */
const DEFAULTS: Settings = {
  ...defaults(2915, SOUND_EVENTS),
  animation: 3,
  playerFirst: true,
  progression: 'sequential',
  startingBoard: 0,
  dragBitmaps: true,
  showDragZones: false,
  showDropZones: false,
};

const KEY = 'engulf';

export function loadEngulfSettings(): Settings {
  const s = loadSettings(KEY, DEFAULTS);
  return {
    ...s,
    playerFirst: s.playerFirst !== false,
    progression: ['same', 'random', 'sequential'].includes(s.progression) ? s.progression : 'sequential',
    startingBoard: Number.isInteger(s.startingBoard) ? ((s.startingBoard % LAYOUTS) + LAYOUTS) % LAYOUTS : 0,
    dragBitmaps: s.dragBitmaps !== false,
    showDragZones: s.showDragZones === true,
    showDropZones: s.showDropZones === true,
  };
}

export const saveEngulfSettings = (s: Settings): void => saveSettings(KEY, s);
