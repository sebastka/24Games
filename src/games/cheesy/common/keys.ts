// The keys the arcade games let the player choose (Cheesy Pursuit's Player Keys, MazeRace's
// Keys tab): the original's table of names (a string table at 0x416000 in cheesy.exe, ending
// with "EOL") with their StarView key codes, here with the browser's KeyboardEvent.code.

export interface Key {
  /** The name shown in the original's lists. */
  name: string;
  /** KeyboardEvent.code values that are this key. */
  codes: readonly string[];
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => ({ name: l, codes: [`Key${l}`] }));
const digits = '0123456789'.split('').map((d) => ({ name: d, codes: [`Digit${d}`, `Numpad${d}`] }));
const functions = Array.from({ length: 12 }, (_, i) => ({ name: `F${i + 1}`, codes: [`F${i + 1}`] }));

export const KEYS: readonly Key[] = [
  { name: 'Up', codes: ['ArrowUp'] },
  { name: 'Down', codes: ['ArrowDown'] },
  { name: 'Left', codes: ['ArrowLeft'] },
  { name: 'Right', codes: ['ArrowRight'] },
  ...digits,
  ...letters,
  ...functions,
  { name: 'Home', codes: ['Home'] },
  { name: 'End', codes: ['End'] },
  { name: 'Page Up', codes: ['PageUp'] },
  { name: 'Page Down', codes: ['PageDown'] },
  { name: 'Return', codes: ['Enter', 'NumpadEnter'] },
  { name: 'ESC', codes: ['Escape'] },
  { name: 'Tab', codes: ['Tab'] },
  { name: 'Backspace', codes: ['Backspace'] },
  { name: 'Space', codes: ['Space'] },
  { name: 'Insert', codes: ['Insert'] },
  { name: 'Delete', codes: ['Delete'] },
  { name: '-', codes: ['Minus', 'NumpadSubtract'] },
  { name: '/', codes: ['Slash', 'NumpadDivide'] },
  { name: '.', codes: ['Period', 'NumpadDecimal'] },
  { name: ',', codes: ['Comma'] },
  { name: '=', codes: ['Equal'] },
];

export const KEY_NAMES = KEYS.map((k) => k.name);

/** Whether a keyboard event is the key named `name`. */
export const isKey = (e: { code: string }, name: string): boolean =>
  KEYS.find((k) => k.name === name)?.codes.includes(e.code) ?? false;
