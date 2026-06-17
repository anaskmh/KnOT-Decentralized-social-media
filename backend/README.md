# KnOT — Backend (Nostr Relay)

A small, readable Nostr relay (NIP-01) written in plain Python.
It stores notes in SQLite and serves them to the KnOT web client over WebSocket.

## Folder layout

```
backend/
  relay/
    nostr.py        # compute event id + verify Schnorr signature
    storage.py      # SQLite store + NIP-01 filter matching
    server.py       # the WebSocket relay (EVENT / REQ / CLOSE / EOSE + live feed)
  nostr/            # Python mirror of the browser's frontend/src/nostr/* modules
    keys.py         # keypair + npub/nsec (NIP-19)
    events.py       # build + sign every event kind (NIP-01)
    relay.py        # publish to / fetch from relays
    format.py       # display helpers (time-ago, short npub, …)
    dm.py           # encrypt / decrypt DMs (NIP-04)
    nwc.py          # Nostr Wallet Connect client (NIP-47)
    zap.py          # Lightning zaps (NIP-57 / LNURL)
    moderation.py   # sensitive-content detection
    bech32.py       # bech32 support for NIP-19
  publish_note.py   # standalone: sign a note + publish it to ALL relays (the WRITE side)
  requirements.txt
```

## The `nostr/` package (same functions as the web client, in Python)

Run examples from the `backend/` folder:

```bash
source venv/bin/activate
python3 -c "from nostr import keys; print(keys.create_identity()['npub'])"
```

```python
import asyncio
from nostr import keys, events, relay

me = keys.create_identity()
note = events.build_note(me["priv"], "Hello from Python!")
asyncio.run(relay.publish(note))          # → all 4 relays
```

## Publish a note from the backend

The relay only *verifies + stores*; signing and publishing normally happen in
the browser. `publish_note.py` is a small reference for the write side (sign →
`["EVENT", …]`). It publishes to the **same 4 relays the web client uses**
(KnOT local + Damus + Primal + nos.lol) and reports each one:

```bash
cd backend && source venv/bin/activate
python3 publish_note.py "Hello from the backend!"
# Publishing to 4 relays…
#   ws://127.0.0.1:8765    accepted ✅
#   wss://relay.damus.io   accepted ✅
#   ...
# Accepted by N/4 relays.
```

> **Wallet:** KnOT connects to a Lightning wallet over **Nostr Wallet Connect
> (NIP-47)** — e.g. Alby, Mutiny, or Rizful. The wallet provider holds the
> balance and transaction history on its side, so there is no wallet code or
> database here. Paste your wallet's `nostr+walletconnect://…` string into the
> app's **Wallet** screen to connect.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run the relay

```bash
cd relay
python3 server.py
# → KnOT relay listening on ws://127.0.0.1:8765
```

The frontend connects to `ws://127.0.0.1:8765` by default.

## How it works

1. The browser creates a keypair and **signs** each note locally (NIP-01).
2. It sends `["EVENT", event]` to the relay over WebSocket.
3. The relay re-derives the event id and **verifies** the signature
   (`relay/nostr.py`) before storing it (`relay/storage.py`).
4. The browser subscribes with `["REQ", sub_id, filter]`; the relay returns
   matching stored events, an `EOSE`, then **pushes new events live**.
