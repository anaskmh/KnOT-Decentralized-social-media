"""
Nostr Wallet Connect client — NIP-47 (mirror of nwc.js)
-------------------------------------------------------
The "app" side of NWC. Given a wallet's connection string, send encrypted
kind-23194 requests over its relay and read the encrypted kind-23195 reply.

A connection string looks like:
    nostr+walletconnect://<wallet_pubkey>?relay=<wss://…>&secret=<hex>

Install:
    pip install coincurve websockets cryptography
"""

import asyncio
import json
import uuid
from urllib.parse import parse_qs

import websockets

from . import dm, events

REQUEST_KIND = 23194
RESPONSE_KIND = 23195


# Parse "nostr+walletconnect://<pubkey>?relay=…&secret=…"
def parse_nwc(uri):
    body = uri.strip()
    for prefix in ("nostr+walletconnect://", "nostrwalletconnect://"):
        if body.startswith(prefix):
            body = body[len(prefix):]
    wallet_pub, _, query = body.partition("?")
    params = parse_qs(query)
    return {
        "wallet_pub": wallet_pub,
        "relay": params["relay"][0],
        "secret": params["secret"][0],
    }


# Send one NIP-47 request and return its decrypted JSON body.
async def request(conn, method, params=None):
    secret = conn["secret"]
    wallet_pub = conn["wallet_pub"]

    # Encrypt {method, params} to the wallet and sign it as kind 23194.
    content = dm.encrypt(secret, wallet_pub, json.dumps({"method": method, "params": params or {}}))
    req = events.sign_event(secret, REQUEST_KIND, [["p", wallet_pub]], content)

    sub_id = uuid.uuid4().hex[:8]
    async with websockets.connect(conn["relay"]) as ws:
        await ws.send(json.dumps(["REQ", sub_id, {"kinds": [RESPONSE_KIND], "#e": [req["id"]]}]))
        await ws.send(json.dumps(["EVENT", req]))
        while True:
            message = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
            if message[0] == "EVENT" and message[1] == sub_id:
                return json.loads(dm.decrypt(secret, wallet_pub, message[2]["content"]))


# Convenience wrappers around the NIP-47 methods.
async def get_balance(conn):
    return await request(conn, "get_balance")


async def make_invoice(conn, sats, description=""):
    return await request(conn, "make_invoice", {"amount": sats * 1000, "description": description})


async def pay_invoice(conn, invoice, zap_request=None):
    params = {"invoice": invoice}
    if zap_request:
        params["zap_request"] = zap_request
    return await request(conn, "pay_invoice", params)


async def list_transactions(conn, limit=20):
    return await request(conn, "list_transactions", {"limit": limit})
