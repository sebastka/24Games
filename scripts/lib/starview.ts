// StarView 2.21 resources (Star Division's C++ toolkit the games are written with) are stored as
// custom PE resource types (256 and up). Each starts with an 8-byte header: the resource id
// (u16), the resource class (u16, e.g. 0x0111 for a string), then sizes. Only plain strings
// are needed here.

const HEADER = 8;

/** The NUL-separated, non-empty Latin-1 strings of a StarView string resource. */
export function strings(resource: Uint8Array): string[] {
  return new TextDecoder('latin1')
    .decode(resource.subarray(HEADER))
    .split('\0')
    .filter((s) => s.length > 0);
}
