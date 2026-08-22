#!/usr/bin/env python3
"""Patch the versionCode inside a prebuilt Android App Bundle.

Only base/manifest/AndroidManifest.xml (protobuf-encoded) is touched; every
other entry of the bundle is copied byte-for-byte. No app code is rebuilt.

Usage: python3 scripts/patch-aab-version-code.py <in.aab> <out.aab> <versionCode>
"""
import sys
import zipfile


def read_varint(buf, i):
    shift = 0
    val = 0
    while True:
        b = buf[i]
        i += 1
        val |= (b & 0x7F) << shift
        if not b & 0x80:
            return val, i
        shift += 7


def write_varint(val):
    out = bytearray()
    while True:
        b = val & 0x7F
        val >>= 7
        if val:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def parse(buf):
    """Parse a protobuf message into [(field, wiretype, value)]."""
    i = 0
    out = []
    n = len(buf)
    while i < n:
        key, i = read_varint(buf, i)
        field, wt = key >> 3, key & 7
        if wt == 0:
            v, i = read_varint(buf, i)
            out.append((field, wt, v))
        elif wt == 1:
            out.append((field, wt, buf[i:i + 8]))
            i += 8
        elif wt == 5:
            out.append((field, wt, buf[i:i + 4]))
            i += 4
        elif wt == 2:
            ln, i = read_varint(buf, i)
            payload = buf[i:i + ln]
            if len(payload) != ln:
                raise ValueError("truncated")
            i += ln
            sub = None
            if payload:
                try:
                    sub = parse(payload)
                except Exception:
                    sub = None
            out.append((field, wt, sub if sub is not None else payload))
        else:
            raise ValueError("bad wiretype %s" % wt)
    return out


def serialize(msg):
    out = bytearray()
    for field, wt, value in msg:
        out += write_varint((field << 3) | wt)
        if wt == 0:
            out += write_varint(value)
        elif wt in (1, 5):
            out += value
        else:
            payload = serialize(value) if isinstance(value, list) else value
            out += write_varint(len(payload))
            out += payload
    return bytes(out)


def is_version_code_attr(msg):
    if not isinstance(msg, list):
        return False
    for field, wt, value in msg:
        if field == 2 and wt == 2 and value == b"versionCode":
            return True
    return False


def patch_attr(msg, code):
    patched = []
    for field, wt, value in msg:
        if field == 3 and wt == 2:  # string value
            patched.append((field, wt, str(code).encode()))
        elif field == 6 and wt == 2 and isinstance(value, list):  # compiled_item
            prim = []
            for f2, w2, v2 in value:
                if f2 == 7 and w2 == 2 and isinstance(v2, list):
                    prim.append((f2, w2, [(f3, w3, code if w3 == 0 else v3)
                                          for f3, w3, v3 in v2]))
                else:
                    prim.append((f2, w2, v2))
            patched.append((field, wt, prim))
        else:
            patched.append((field, wt, value))
    return patched


def walk(msg, code, state):
    out = []
    for field, wt, value in msg:
        if wt == 2 and isinstance(value, list):
            if is_version_code_attr(value):
                value = patch_attr(value, code)
                state["found"] += 1
            else:
                value = walk(value, code, state)
        out.append((field, wt, value))
    return out


def main():
    src, dst, code = sys.argv[1], sys.argv[2], int(sys.argv[3])
    with zipfile.ZipFile(src) as zin:
        entries = [(zi, zin.read(zi.filename)) for zi in zin.infolist()]

    state = {"found": 0}
    patched_entries = []
    for zi, data in entries:
        if zi.filename == "base/manifest/AndroidManifest.xml":
            data = serialize(walk(parse(data), code, state))
        patched_entries.append((zi, data))

    if state["found"] != 1:
        raise SystemExit("expected exactly one versionCode attribute, found %s"
                         % state["found"])

    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for zi, data in patched_entries:
            new = zipfile.ZipInfo(zi.filename, date_time=zi.date_time)
            new.compress_type = zi.compress_type
            new.external_attr = zi.external_attr
            zout.writestr(new, data)

    print("Patched versionCode -> %d" % code)


if __name__ == "__main__":
    main()
