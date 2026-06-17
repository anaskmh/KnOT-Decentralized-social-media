"""
backend/nostr — Python mirror of the browser's frontend/src/nostr/* modules.

Same Nostr functions, in plain Python, so the backend can do everything the
web client does: make keys, build + sign events, talk to relays, encrypt DMs,
zap, and screen content.

    keys.py        keypair + npub/nsec (NIP-19)
    events.py      build + sign every event kind (NIP-01)
    relay.py       publish to / fetch from relays (WebSocket)
    format.py      small display helpers (time-ago, short npub, …)
    dm.py          encrypt / decrypt direct messages (NIP-04)
    nwc.py         Nostr Wallet Connect client (NIP-47)
    zap.py         Lightning zaps (NIP-57 / LNURL)
    moderation.py  sensitive-content detection
    bech32.py      bech32 encoding used by NIP-19 (support module)

Run examples from the backend/ folder, e.g.:
    python3 -c "from nostr import keys; print(keys.create_identity()['npub'])"
"""
