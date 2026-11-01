// The games' WAV sounds. Like sndPlaySound, which the originals use, a sound stops the one
// still playing.

const urls = import.meta.glob<string>('../assets/sounds/*.wav', { query: '?url', import: 'default', eager: true });
const byName = new Map(Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/|\.wav$/g, ''), url]));

/** Names of all the sounds of the CD, for the per-event sound choice. */
export const SOUND_NAMES = [...byName.keys()].sort();

let playing: HTMLAudioElement | null = null;

export function playSound(name: string): void {
  const url = byName.get(name);
  if (!url) return;
  playing?.pause();
  playing = new Audio(url);
  playing.play().catch(() => {
    // Autoplay refused before any user gesture, or no audio device: stay silent.
  });
}

let audio: AudioContext | null = null;

/** The system beep (MessageBeep), e.g. for an undo with nothing to undo. */
export function beep(): void {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.15);
  } catch {
    // No Web Audio.
  }
}
