"""
Keys — your Nostr identity (mirror of frontend/src/nostr/keys.js)
-----------------------------------------------------------------
A Nostr identity is just a keypair:
    private key (nsec)  →  secret, signs your events
    public key  (npub)  →  your public identity / handle

Install:
    pip install coincurve
"""

import secrets

from coincurve import PrivateKey

from . import bech32


# 32 random bytes as hex — that's all a private key is.
def generate_private_key():
    return secrets.token_hex(32)


# Derive the x-only public key (Schnorr / secp256k1) from a private key.
def get_public_key(priv_hex):
    private_key = PrivateKey(bytes.fromhex(priv_hex))
    return private_key.public_key.format(compressed=True)[1:].hex()


# hex pubkey → "npub1…"  (NIP-19)
def to_npub(pub_hex):
    return bech32.encode("npub", bytes.fromhex(pub_hex))


# hex privkey → "nsec1…"  (NIP-19)
def to_nsec(priv_hex):
    return bech32.encode("nsec", bytes.fromhex(priv_hex))


# "npub1…" or "nsec1…" → hex
def from_bech32(value):
    _, raw = bech32.decode(value)
    return raw.hex()


# Make a fresh identity with every form of the keys filled in.
def create_identity():
    priv = generate_private_key()
    pub = get_public_key(priv)
    return {
        "priv": priv,
        "pub": pub,
        "npub": to_npub(pub),
        "nsec": to_nsec(priv),
    }


# Log in from an existing nsec (or raw hex private key).
def import_identity(nsec_or_hex):
    priv = from_bech32(nsec_or_hex) if nsec_or_hex.startswith("nsec") else nsec_or_hex.strip()
    pub = get_public_key(priv)
    return {"priv": priv, "pub": pub, "npub": to_npub(pub), "nsec": to_nsec(priv)}


if __name__ == "__main__":
    me = create_identity()
    print("npub:", me["npub"])
    print("nsec:", me["nsec"])
