"""Print the export table of a PE file as 'DLLNAME ordinal name' lines."""
import struct
import sys


def exports(path):
    d = open(path, 'rb').read()
    pe = struct.unpack_from('<I', d, 0x3C)[0]
    nsec = struct.unpack_from('<H', d, pe + 6)[0]
    opt = pe + 24
    secs = opt + struct.unpack_from('<H', d, pe + 20)[0]
    sections = [struct.unpack_from('<8sIIII', d, secs + i * 40) for i in range(nsec)]

    def off(rva):
        for _, vsize, va, rsize, raw in sections:
            if va <= rva < va + max(vsize, rsize):
                return rva - va + raw
        raise ValueError(hex(rva))

    exp_rva = struct.unpack_from('<I', d, opt + 96)[0]
    e = off(exp_rva)
    name_rva, base, nfunc, nnames, funcs, names, ords = struct.unpack_from('<IIIIIII', d, e + 12)
    dll = d[off(name_rva):].split(b'\0')[0].decode()
    out = {}
    for i in range(nnames):
        n = d[off(struct.unpack_from('<I', d, off(names) + 4 * i)[0]):].split(b'\0')[0].decode('latin1')
        o = struct.unpack_from('<H', d, off(ords) + 2 * i)[0] + base
        out[o] = n
    return dll, out


for p in sys.argv[1:]:
    dll, out = exports(p)
    for o, n in sorted(out.items()):
        print(dll.upper(), o, n)
