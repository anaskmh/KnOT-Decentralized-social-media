"""
Events — build + sign every kind KnOT uses (mirror of events.js)
----------------------------------------------------------------
Each helper fills in the fields and signs the event:
    1. compute the id  (SHA-256 of the canonical array, NIP-01)
    2. sign the id     (Schnorr signature)

Kinds (NIPs):
    0     profile metadata      1     text note         3     contacts/follows
    4     encrypted DM          6     repost            7     reaction/like
    9734  zap request           10000 mute list         10003 bookmark list
"""

import hashlib
import json
import time

from coincurve import PrivateKey

KIND_PROFILE = 0
KIND_NOTE = 1
KIND_CONTACTS = 3
KIND_DM = 4
KIND_REPOST = 6
KIND_REACTION = 7
KIND_ZAP_REQUEST = 9734
KIND_MUTES = 10000
KIND_BOOKMARKS = 10003


def _now():
    return int(time.time())


# The one place signing happens — every builder below calls this.
def sign_event(priv_hex, kind, tags, content):
    private_key = PrivateKey(bytes.fromhex(priv_hex))
    pubkey = private_key.public_key.format(compressed=True)[1:].hex()

    event = {"pubkey": pubkey, "created_at": _now(), "kind": kind, "tags": tags, "content": content}

    # id = SHA-256 of [0, pubkey, created_at, kind, tags, content]
    id_data = [0, event["pubkey"], event["created_at"], event["kind"], event["tags"], event["content"]]
    id_json = json.dumps(id_data, separators=(",", ":"), ensure_ascii=False)
    event["id"] = hashlib.sha256(id_json.encode("utf-8")).hexdigest()

    # Schnorr signature over the id
    event["sig"] = private_key.sign_schnorr(bytes.fromhex(event["id"])).hex()
    return event


# A plain text note.
def build_note(priv_hex, content):
    return sign_event(priv_hex, KIND_NOTE, [], content)


# A reply — tags the note + author it replies to (NIP-10).
def build_reply(priv_hex, content, reply_to):
    tags = [["e", reply_to["id"], "", "reply"], ["p", reply_to["pubkey"]]]
    return sign_event(priv_hex, KIND_NOTE, tags, content)


# A like / reaction (NIP-25). content "+" is the standard "like".
def build_reaction(priv_hex, target, content="+"):
    tags = [["e", target["id"]], ["p", target["pubkey"]]]
    return sign_event(priv_hex, KIND_REACTION, tags, content)


# A repost (NIP-18). content is the stringified original event.
def build_repost(priv_hex, target):
    tags = [["e", target["id"]], ["p", target["pubkey"]]]
    return sign_event(priv_hex, KIND_REPOST, tags, json.dumps(target))


# Profile metadata (kind 0). profile = {"name":..., "about":..., "picture":...}
def build_profile(priv_hex, profile):
    return sign_event(priv_hex, KIND_PROFILE, [], json.dumps(profile))


# Contact list / follows (NIP-02). pubkeys = hex pubkeys you follow.
def build_contacts(priv_hex, pubkeys):
    return sign_event(priv_hex, KIND_CONTACTS, [["p", pk] for pk in pubkeys], "")


# Mute list (NIP-51 kind 10000).
def build_mutes(priv_hex, pubkeys):
    return sign_event(priv_hex, KIND_MUTES, [["p", pk] for pk in pubkeys], "")


# Bookmark list (NIP-51 kind 10003).
def build_bookmarks(priv_hex, event_ids):
    return sign_event(priv_hex, KIND_BOOKMARKS, [["e", i] for i in event_ids], "")


# Encrypted direct message (NIP-04). Needs the dm module for encryption.
def build_dm(priv_hex, recipient_pub, text):
    from . import dm

    ciphertext = dm.encrypt(priv_hex, recipient_pub, text)
    return sign_event(priv_hex, KIND_DM, [["p", recipient_pub]], ciphertext)


# A zap request (NIP-57). Handed to a wallet's LNURL callback.
def build_zap_request(priv_hex, recipient_pub, amount_msat, relays, event_id=None, comment=""):
    tags = [["p", recipient_pub], ["amount", str(amount_msat)], ["relays", *relays]]
    if event_id:
        tags.append(["e", event_id])
    return sign_event(priv_hex, KIND_ZAP_REQUEST, tags, comment)
