"""
Relay — publish to / fetch from relays (mirror of relay.js)
-----------------------------------------------------------
The browser uses a long-lived WebSocket per relay (the RelayPool). On the
backend it's simpler to open a socket, do one thing, and close — so here we
expose two async helpers that fan out across all relays:

    publish(event)   → send ["EVENT", event] to every relay, collect OK replies
    fetch(filter)    → send ["REQ", …] to every relay, merge + de-dup results

Install:
    pip install websockets
"""

import asyncio
import json
import uuid

import websockets

# Same relays as the web client's RelayPool.
DEFAULT_RELAYS = [
    "ws://127.0.0.1:8765",   # KnOT (local)
    "wss://relay.damus.io",  # Damus
    "wss://relay.primal.net",  # Primal
    "wss://nos.lol",         # nos.lol
]


# ── Publish to one relay and return its ["OK", id, accepted, msg] reply ──
async def _publish_one(url, event):
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps(["EVENT", event]))
        return json.loads(await asyncio.wait_for(ws.recv(), timeout=10))


# Publish a signed event to every relay at once. Returns {url: reply}.
async def publish(event, urls=DEFAULT_RELAYS):
    results = await asyncio.gather(
        *(_publish_one(u, event) for u in urls),
        return_exceptions=True,  # one bad relay shouldn't sink the rest
    )
    return dict(zip(urls, results))


# ── Fetch stored events from one relay until EOSE (or timeout) ──────────
async def _fetch_one(url, filters, timeout):
    events = []
    sub_id = uuid.uuid4().hex[:8]
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps(["REQ", sub_id, filters]))
        loop = asyncio.get_event_loop()
        deadline = loop.time() + timeout
        while True:
            remaining = deadline - loop.time()
            if remaining <= 0:
                break
            try:
                message = json.loads(await asyncio.wait_for(ws.recv(), timeout=remaining))
            except asyncio.TimeoutError:
                break
            if message[0] == "EVENT" and message[1] == sub_id:
                events.append(message[2])
            elif message[0] == "EOSE" and message[1] == sub_id:
                break
        try:
            await ws.send(json.dumps(["CLOSE", sub_id]))
        except Exception:
            pass
    return events


# Query every relay with a filter, merge results, drop duplicates (newest first).
async def fetch(filters, urls=DEFAULT_RELAYS, timeout=8):
    results = await asyncio.gather(
        *(_fetch_one(u, filters, timeout) for u in urls),
        return_exceptions=True,
    )
    by_id = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        for event in result:
            by_id[event["id"]] = event
    return sorted(by_id.values(), key=lambda e: e["created_at"], reverse=True)
