// The window backgrounds every game offers in Options › Extras (CZGAME32.DLL): the 16 StarView
// colours, then 15 textures.

const textures = import.meta.glob<string>('../assets/backgrounds/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

export interface Background {
  name: string;
  /** CSS colour of a plain background. */
  color?: string;
  /** URL of a tiled texture. */
  texture?: string;
}

// StarView's ColorName values COL_BLACK … COL_WHITE.
const COLORS: [string, string][] = [
  ['Black', '#000000'],
  ['Blue', '#000080'],
  ['Green', '#008000'],
  ['Cyan', '#008080'],
  ['Red', '#800000'],
  ['Magenta', '#800080'],
  ['Brown', '#808000'],
  ['Gray', '#808080'],
  ['Light Gray', '#c0c0c0'],
  ['Light Blue', '#0000ff'],
  ['Light Green', '#00ff00'],
  ['Light Cyan', '#00ffff'],
  ['Light Red', '#ff0000'],
  ['Light Magenta', '#ff00ff'],
  ['Yellow', '#ffff00'],
  ['White', '#ffffff'],
];

const TEXTURES = [
  'Gray Surface',
  'Moo Cow',
  'Psychedelic',
  'Marble',
  'Paintball',
  'Bowling Shirt',
  'Brown Scrunch',
  'Jewels',
  'Purple Haze',
  'Red Vinyl',
  'Fizzy Green',
  'Brick',
  'Blue Haze',
  'Blue Swirl',
  'Green Ghosts',
];

export const BACKGROUNDS: Background[] = [
  ...COLORS.map(([name, color]) => ({ name, color })),
  ...TEXTURES.map((name, i) => ({ name, texture: textures[`../assets/backgrounds/${i + 1}.png`] })),
];
