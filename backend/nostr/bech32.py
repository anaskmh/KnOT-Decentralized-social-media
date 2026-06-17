"""
bech32 encoding (BIP-173)
-------------------------
This is the text encoding NIP-19 uses to turn raw keys into the friendly
"npub1…" / "nsec1…" strings (and back). It's the Python equivalent of what
nostr-tools does in the browser.

Reference implementation, trimmed to what we need. Pure Python, no deps.
"""

CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"


def _polymod(values):
    generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    chk = 1
    for value in values:
        top = chk >> 25
        chk = (chk & 0x1ffffff) << 5 ^ value
        for i in range(5):
            chk ^= generator[i] if ((top >> i) & 1) else 0
    return chk


def _hrp_expand(hrp):
    return [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]


def _checksum(hrp, data):
    values = _hrp_expand(hrp) + data
    polymod = _polymod(values + [0, 0, 0, 0, 0, 0]) ^ 1
    return [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]


# Regroup bits, e.g. 8-bit bytes → 5-bit groups (and back).
def _convertbits(data, frombits, tobits, pad=True):
    acc = 0
    bits = 0
    result = []
    maxv = (1 << tobits) - 1
    for value in data:
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            result.append((acc >> bits) & maxv)
    if pad and bits:
        result.append((acc << (tobits - bits)) & maxv)
    return result


# Encode raw bytes into a bech32 string with the given prefix (hrp).
def encode(hrp, data_bytes):
    data = _convertbits(list(data_bytes), 8, 5)
    combined = data + _checksum(hrp, data)
    return hrp + "1" + "".join(CHARSET[d] for d in combined)


# Decode a bech32 string → (prefix, raw bytes). Drops the 6-char checksum.
def decode(bech):
    pos = bech.rfind("1")
    hrp = bech[:pos]
    data = [CHARSET.find(c) for c in bech[pos + 1:]]
    decoded = _convertbits(data[:-6], 5, 8, False)
    return hrp, bytes(decoded)
