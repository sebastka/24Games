import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { decodeBitmap, decodeIcon, groupIconId } from '../scripts/lib/dib.ts';
import { readResources, resource, RT } from '../scripts/lib/pe.ts';
import { encodePng } from '../scripts/lib/png.ts';
import { strings } from '../scripts/lib/starview.ts';

const original = (file: string) => readFile(new URL(`../original/win95/program/${file}`, import.meta.url));

test('reads the resources of a PE file', async () => {
  const res = readResources(await original('bulldoze.exe'));
  assert.deepEqual([...res.get(RT.BITMAP)!.keys()], [257, 258]);
  assert.equal(res.get(273)!.size, 62); // 60 levels, THE END, the piece set names
  assert.throws(() => resource(res, RT.BITMAP, 999), /no resource 2\/999/);
  assert.throws(() => readResources(new Uint8Array(64)), /not an MZ executable/);
});

test('decodes 4-bit and 1-bit bitmaps, top-down', async () => {
  const res = readResources(await original('bulldoze.exe'));
  const color = decodeBitmap(resource(res, RT.BITMAP, 257));
  assert.equal(color.width, 512);
  assert.equal(color.height, 64);
  // Tile 0 (floor) is black and its mask (bottom half) white.
  assert.deepEqual([...color.rgba.subarray(0, 4)], [0, 0, 0, 255]);
  assert.deepEqual([...color.rgba.subarray(32 * 512 * 4, 32 * 512 * 4 + 4)], [255, 255, 255, 255]);
  const mono = decodeBitmap(resource(res, RT.BITMAP, 258));
  assert.equal(mono.width, 512);
});

test('decodes an icon with its transparency mask', async () => {
  const res = readResources(await original('bulldoze.exe'));
  const group = res.get(RT.GROUP_ICON)!.values().next().value!;
  const icon = decodeIcon(resource(res, RT.ICON, groupIconId(group)));
  assert.equal(icon.width, 32);
  assert.equal(icon.height, 32);
  const alphas = new Set(Array.from({ length: 32 * 32 }, (_, i) => icon.rgba[i * 4 + 3]));
  assert.deepEqual([...alphas].sort(), [0, 255]);
});

test('reads StarView strings', async () => {
  const res = readResources(await original('bulldoze.exe'));
  assert.deepEqual(strings(resource(res, 273, 256)), ['Bulldozer,Monochrome']);
});

test('encodes PNGs: indexed when there are few colours, RGBA otherwise', () => {
  const chunks = (png: Uint8Array) => {
    const out = new Map<string, Uint8Array>();
    const view = new DataView(png.buffer, png.byteOffset);
    for (let at = 8; at < png.length;) {
      const length = view.getUint32(at);
      out.set(new TextDecoder().decode(png.subarray(at + 4, at + 8)), png.subarray(at + 8, at + 8 + length));
      at += 12 + length;
    }
    return out;
  };
  const twoColours = { width: 2, height: 1, rgba: new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0]) };
  const indexed = chunks(encodePng(twoColours));
  assert.equal(indexed.get('IHDR')![9], 3);
  assert.deepEqual([...indexed.get('tRNS')!], [255, 0]);
  assert.deepEqual([...inflateSync(indexed.get('IDAT')!)], [0, 0, 1]);

  // 300 distinct colours: pixel p is (p % 256, p >> 8, 0).
  const many = new Uint8Array(300 * 4).map((_, i) => [Math.floor(i / 4) % 256, Math.floor(i / 1024), 0, 255][i % 4]!);
  const rgba = chunks(encodePng({ width: 300, height: 1, rgba: many }));
  assert.equal(rgba.get('IHDR')![9], 6);
  assert.equal(inflateSync(rgba.get('IDAT')!).length, 1 + 300 * 4);
});
