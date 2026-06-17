"""
KnOT Relay – a simple Nostr relay (NIP-01)
------------------------------------------
A relay is just a WebSocket server that speaks four messages:

    Client → Relay
        ["EVENT", <event>]              publish a note
        ["REQ", <sub_id>, <filter>...]  subscribe / search
        ["CLOSE", <sub_id>]             stop a subscription

    Relay → Client
        ["OK", <id>, <bool>, <msg>]     did we accept your event?
        ["EVENT", <sub_id>, <event>]    here is a matching event
        ["EOSE", <sub_id>]              end of stored events

After EOSE we keep the subscription open and push any NEW event that
matches the filter — that is what makes the KnOT feed feel live.

Install:
    pip install coincurve websockets

Run:
    python3 server.py        # listens on ws://127.0.0.1:8765
"""

import asyncio
import json

import websockets

from nostr import verify_event
from storage import Storage, event_matches_filter

HOST = "127.0.0.1"
PORT = 8765

# Our event database (one SQLite file next to this script).
store = Storage("events.db")

# Every connected client keeps its own set of open subscriptions:
#   subscriptions[websocket] = { sub_id: filters_list }
subscriptions = {}


# ─────────────────────────────────────────────
# Handle one connected client
# ─────────────────────────────────────────────
async def handle_client(websocket):
    subscriptions[websocket] = {}
    print("Client connected")

    try:
        async for raw_message in websocket:
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            kind = message[0]

            if kind == "EVENT":
                await handle_event(websocket, message[1])
            elif kind == "REQ":
                await handle_req(websocket, message[1], message[2:])
            elif kind == "CLOSE":
                handle_close(websocket, message[1])

    except websockets.ConnectionClosed:
        pass
    finally:
        subscriptions.pop(websocket, None)
        print("Client disconnected")


# ─────────────────────────────────────────────
# Content policy (our relay, our rules)
# ─────────────────────────────────────────────
# Nobody can delete content from the Nostr NETWORK, but each relay decides
# what IT stores. Ours refuses notes containing these words, so the KnOT
# relay itself never hosts adult content. (Clients additionally hide/blur
# whatever arrives from public relays — see the frontend's moderation.js.)
BLOCKED_WORDS = ["porn", "xxx", "nudes", "onlyfans", "hentai"]


def violates_policy(event):
    if event.get("kind") != 1:          # only text notes are screened
        return False
    content = event.get("content", "").lower()
    return any(word in content for word in BLOCKED_WORDS)


# ─────────────────────────────────────────────
# EVENT – a client wants to publish a note
# ─────────────────────────────────────────────
async def handle_event(websocket, event):
    # 1. Verify the event is genuine (id matches + signature valid).
    is_valid, reason = verify_event(event)
    if not is_valid:
        await websocket.send(json.dumps(["OK", event.get("id", ""), False, reason]))
        return

    # 1b. Apply our content policy before storing anything.
    if violates_policy(event):
        await websocket.send(json.dumps(
            ["OK", event["id"], False, "blocked: content not allowed on this relay"]
        ))
        return

    # 2. Store it (duplicates are silently accepted).
    store.save_event(event)
    await websocket.send(json.dumps(["OK", event["id"], True, ""]))

    # 3. Push it to everyone whose open subscription matches.
    await broadcast_event(event)


# ─────────────────────────────────────────────
# REQ – a client wants stored events + live updates
# ─────────────────────────────────────────────
async def handle_req(websocket, sub_id, filters_list):
    # Remember this subscription so future events can be pushed to it.
    subscriptions[websocket][sub_id] = filters_list

    # Send every stored event that matches ANY of the filters.
    sent_ids = set()
    for filters in filters_list:
        for event in store.query_events(filters):
            if event["id"] in sent_ids:
                continue
            sent_ids.add(event["id"])
            await websocket.send(json.dumps(["EVENT", sub_id, event]))

    # Tell the client we have sent all the stored ("End Of Stored Events").
    await websocket.send(json.dumps(["EOSE", sub_id]))


# ─────────────────────────────────────────────
# CLOSE – a client is done with a subscription
# ─────────────────────────────────────────────
def handle_close(websocket, sub_id):
    subscriptions.get(websocket, {}).pop(sub_id, None)


# ─────────────────────────────────────────────
# Push a new event to every matching open subscription
# ─────────────────────────────────────────────
async def broadcast_event(event):
    for client_ws, subs in list(subscriptions.items()):
        for sub_id, filters_list in subs.items():
            if any(event_matches_filter(event, f) for f in filters_list):
                try:
                    await client_ws.send(json.dumps(["EVENT", sub_id, event]))
                except websockets.ConnectionClosed:
                    pass


# ─────────────────────────────────────────────
# Start the relay
# ─────────────────────────────────────────────
async def main():
    print(f"KnOT relay listening on ws://{HOST}:{PORT}")
    async with websockets.serve(handle_client, HOST, PORT):
        await asyncio.Future()   # run forever


if __name__ == "__main__":
    asyncio.run(main())
