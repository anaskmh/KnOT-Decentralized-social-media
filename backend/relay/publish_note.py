"""
Publish a note to the relays (backend reference)
------------------------------------------------
A tiny example of the WRITE side of Nostr that reuses the `nostr` package:

    keys.generate_private_key()     make a key
    events.build_note(priv, text)   build + sign the note  (id + Schnorr sig)
    relay.publish(note)             send it to all relays

In the KnOT app this happens in the BROWSER (the private key never leaves the
user's device). This script is just a handy backend / command-line way to post.

Install (see requirements.txt):
    pip install coincurve websockets cryptography

Run (from the backend/ folder):
    python3 publish_note.py "Hello from the backend!"

Optional — reuse a key instead of a fresh random one:
    export NOSTR_PRIVATE_KEY_HEX=<64-char hex>
"""

import asyncio
import os
import sys

from nostr import keys, events, relay


async def main(content):
    # Reuse a saved key if given, otherwise create a fresh random one.
    priv = os.getenv("NOSTR_PRIVATE_KEY_HEX") or keys.generate_private_key()

    # Build + sign the note, then publish it to every relay.
    note = events.build_note(priv, content)
    results = await relay.publish(note)  # → { url: ["OK", id, accepted, msg] | Exception }

    print("Public key:", note["pubkey"])
    print("Event id  :", note["id"])
    print(f"Publishing to {len(results)} relays…")

    accepted = 0
    for url, result in results.items():
        if isinstance(result, Exception):
            print(f"  {url:<28} unreachable ❌")
        elif result[0] == "OK" and result[2]:
            accepted += 1
            print(f"  {url:<28} accepted ✅")
        else:
            print(f"  {url:<28} rejected ❌ {result[3] if len(result) > 3 else ''}")

    print(f"Accepted by {accepted}/{len(results)} relays.")


if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else "Hello from the KnOT backend!"
    asyncio.run(main(text))
