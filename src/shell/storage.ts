// Settings and progress in localStorage (the originals used the registry). Storage can be
// unavailable (private windows, blocked site data): the games then run on their defaults.

const PREFIX = '24games.';

export function load<T extends object>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<T>) } : defaults;
  } catch {
    return defaults;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not persisted; the game goes on.
  }
}
