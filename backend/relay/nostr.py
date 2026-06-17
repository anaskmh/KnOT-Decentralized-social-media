"""
Nostr event helpers (NIP-01)
----------------------------
Pure functions the relay uses to check that an event is real:

    1. recompute the event ID  (SHA-256 of a fixed JSON array)
    2. verify the Schnorr signature against the author's public key

Packaged as small functions so the relay can call them on every
incoming event.

Install:
    pip install coincurve
"""

import hashlib
import json

from coincurve import PublicKeyXOnly


# ─────────────────────────────────────────────
# Compute the event ID
# ─────────────────────────────────────────────
# The ID is SHA-256 of this exact array (NIP-01), serialized with no spaces.

def compute_event_id(event):
    id_data = [
        0,                      # always 0
        event["pubkey"],
        event["created_at"],
        event["kind"],
        event["tags"],
        event["content"],
    ]
    id_json = json.dumps(id_data, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(id_json.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────
# Verify a full event
# ─────────────────────────────────────────────
# Returns (True, "") if the event is genuine, or (False, reason) if not.

def verify_event(event):
    # Every field NIP-01 requires must be present.
    required = ("id", "pubkey", "created_at", "kind", "tags", "content", "sig")
    for field in required:
        if field not in event:
            return False, f"missing field: {field}"

    # 1. The ID must match the content (nothing was tampered with).
    expected_id = compute_event_id(event)
    if expected_id != event["id"]:
        return False, "invalid: id does not match event"

    # 2. The Schnorr signature must be valid for this pubkey + id.
    try:
        public_key = PublicKeyXOnly(bytes.fromhex(event["pubkey"]))
        signature_ok = public_key.verify(
            bytes.fromhex(event["sig"]),
            bytes.fromhex(event["id"]),
        )
    except Exception as error:
        return False, f"invalid: bad signature data ({error})"

    if not signature_ok:
        return False, "invalid: signature verification failed"

    return True, ""
