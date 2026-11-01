// The 24 games, as the original launcher (games.exe) describes them.
import catalog from '../assets/catalog.json';

const icons = import.meta.glob<string>('../assets/icons/*.png', { query: '?url', import: 'default', eager: true });

export interface Game {
  /** The original executable's name (bulldoze, reversi…), also the route. */
  id: string;
  title: string;
  category: string;
  blurb: string;
  rules: string[];
  icon: string;
  smallIcon: string;
}

export const GAMES: Game[] = catalog.map((g) => ({
  ...g,
  icon: icons[`../assets/icons/${g.id}.png`]!,
  smallIcon: icons[`../assets/icons/${g.id}-16.png`]!,
}));

export const LAUNCHER_ICON = icons['../assets/icons/games.png']!;

export const gameById = (id: string): Game | undefined => GAMES.find((g) => g.id === id);
