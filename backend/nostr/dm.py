"""
Direct messages — NIP-04 encryption (mirror of dm.js)
-----------------------------------------------------
A kind-4 message's content is encrypted to a shared secret between the two
pubkeys:
    1. ECDH shared secret (your private key + their public key)
    2. AES-256-CBC with a random IV
    3. formatted as  "<base64 ciphertext>?iv=<base64 iv>"

This matches the browser (nostr-tools) exactly, so Python ↔ JS interop works.

Install:
    pip install coincurve cryptography
"""

import base64
import os

from coincurve import PrivateKey, PublicKey
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7


# Shared secret = X coordinate of (their pubkey point × my private key).
def _shared_secret(my_priv_hex, their_pub_hex):
    their_pub = PublicKey(b"\x02" + bytes.fromhex(their_pub_hex))  # add x-only prefix
    shared_point = their_pub.multiply(bytes.fromhex(my_priv_hex))
    return shared_point.format(compressed=False)[1:33]  # the 32-byte X


def encrypt(my_priv_hex, their_pub_hex, plaintext):
    key = _shared_secret(my_priv_hex, their_pub_hex)
    iv = os.urandom(16)
    padder = PKCS7(128).padder()
    padded = padder.update(plaintext.encode("utf-8")) + padder.finalize()
    encryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(ciphertext).decode() + "?iv=" + base64.b64encode(iv).decode()


def decrypt(my_priv_hex, their_pub_hex, content):
    ciphertext_b64, iv_b64 = content.split("?iv=")
    key = _shared_secret(my_priv_hex, their_pub_hex)
    iv = base64.b64decode(iv_b64)
    ciphertext = base64.b64decode(ciphertext_b64)
    decryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    return (unpadder.update(padded) + unpadder.finalize()).decode("utf-8")


# The other party in a DM (the pubkey that isn't me).
def dm_partner(my_pub, event):
    recipient = next((t[1] for t in event["tags"] if t and t[0] == "p"), None)
    return recipient if event["pubkey"] == my_pub else event["pubkey"]


# Decrypt a received/sent DM event safely.
def decrypt_dm(my_priv, my_pub, event):
    other = dm_partner(my_pub, event)
    try:
        return decrypt(my_priv, other, event["content"])
    except Exception:
        return "[unable to decrypt]"
