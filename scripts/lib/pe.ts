// Reader for the resources of a 32-bit Windows PE file (.exe, .dll).
//
// Only what the asset pipeline needs: the resource tree, flattened to type → id → bytes.
// Named types and ids (strings in the directory) are keyed by their name, numeric ones by
// their number; the language level is collapsed (the games only have US English, 1033).

export type ResourceKey = number | string;
export type Resources = Map<ResourceKey, Map<ResourceKey, Uint8Array>>;

/** Standard resource types (winuser.h) used by the games. */
export const RT = { ICON: 3, BITMAP: 2, GROUP_ICON: 14 } as const;

interface Section {
  virtualAddress: number;
  size: number;
  rawOffset: number;
}

export function readResources(file: Uint8Array): Resources {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint16(0, true) !== 0x5a4d) throw new Error('not an MZ executable');
  const pe = view.getUint32(0x3c, true);
  if (view.getUint32(pe, true) !== 0x4550) throw new Error('not a PE executable');

  const sectionCount = view.getUint16(pe + 6, true);
  const optional = pe + 24;
  if (view.getUint16(optional, true) !== 0x10b) throw new Error('not a PE32 executable');
  const sectionTable = optional + view.getUint16(pe + 20, true);
  const sections: Section[] = [];
  for (let i = 0; i < sectionCount; i++) {
    const s = sectionTable + i * 40;
    sections.push({
      size: Math.max(view.getUint32(s + 8, true), view.getUint32(s + 16, true)),
      virtualAddress: view.getUint32(s + 12, true),
      rawOffset: view.getUint32(s + 20, true),
    });
  }
  const offsetOf = (rva: number): number => {
    const s = sections.find((s) => rva >= s.virtualAddress && rva < s.virtualAddress + s.size);
    if (!s) throw new Error(`RVA 0x${rva.toString(16)} is in no section`);
    return rva - s.virtualAddress + s.rawOffset;
  };

  const out: Resources = new Map();
  // Data directory 2: the resource table.
  const rsrcRva = view.getUint32(optional + 96 + 2 * 8, true);
  if (rsrcRva === 0) return out;
  const root = offsetOf(rsrcRva);

  // Entries of the directory at `dir` (an offset relative to the root of the tree).
  const entries = (dir: number): { key: ResourceKey; target: number; isDir: boolean }[] => {
    const at = root + dir;
    const count = view.getUint16(at + 12, true) + view.getUint16(at + 14, true);
    const list = [];
    for (let i = 0; i < count; i++) {
      const nameField = view.getUint32(at + 16 + i * 8, true);
      const target = view.getUint32(at + 20 + i * 8, true);
      let key: ResourceKey = nameField;
      if (nameField & 0x80000000) {
        const name = root + (nameField & 0x7fffffff);
        const length = view.getUint16(name, true);
        key = String.fromCharCode(...new Uint16Array(file.slice(name + 2, name + 2 + length * 2).buffer));
      }
      list.push({ key, target: target & 0x7fffffff, isDir: (target & 0x80000000) !== 0 });
    }
    return list;
  };

  for (const type of entries(0)) {
    if (!type.isDir) continue;
    const byId = new Map<ResourceKey, Uint8Array>();
    for (const id of entries(type.target)) {
      const language = id.isDir ? entries(id.target)[0] : id;
      if (!language || language.isDir) continue;
      const entry = root + language.target;
      const start = offsetOf(view.getUint32(entry, true));
      byId.set(id.key, file.subarray(start, start + view.getUint32(entry + 4, true)));
    }
    out.set(type.key, byId);
  }
  return out;
}

/** The resource `type`/`id`, or an error naming what is missing. */
export function resource(resources: Resources, type: ResourceKey, id: ResourceKey): Uint8Array {
  const data = resources.get(type)?.get(id);
  if (!data) throw new Error(`no resource ${String(type)}/${String(id)}`);
  return data;
}
