import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundEvents } from '../src/shell/soundEvents.ts';
import { SOUND_EVENTS } from '../src/games/bulldoze/settings.ts';

test('every game lists "<Title> Start" and "<Title> Exit" first, without a sound', () => {
  const events = soundEvents('Nim', { 'Select Pieces': 'click_5' });
  assert.deepEqual(Object.entries(events), [
    ['Nim Start', ''],
    ['Nim Exit', ''],
    ['Select Pieces', 'click_5'],
  ]);
  assert.deepEqual(Object.keys(SOUND_EVENTS).slice(0, 3), ['Bulldozer Start', 'Bulldozer Exit', 'Move']);
});
