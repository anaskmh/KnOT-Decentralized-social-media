"""
Zaps — Lightning tipping, NIP-57 / LNURL (mirror of zap.js)
----------------------------------------------------------
The receive side of a zap:
    1. read the recipient's lightning address (lud16) from their profile
    2. resolve its LNURL-pay endpoint
    3. sign a kind-9734 zap request
    4. ask the endpoint for a bolt11 invoice for the amount

Paying the invoice is then done by a wallet (see nwc.py / a real wallet),
and the recipient's LNURL server publishes the kind-9735 receipt.

Uses urllib from the standard library — no extra HTTP dependency.
"""

import json
from urllib.parse import urlencode
from urllib.request import urlopen

from . import events
from .relay import DEFAULT_RELAYS


# "name@domain" (lud16) → its LNURL-pay URL.
def lnurl_from_address(address):
    name, _, domain = address.partition("@")
    if not name or not domain:
        return None
    return f"https://{domain}/.well-known/lnurlp/{name}"


# Step 2: fetch the LNURL-pay parameters for a recipient profile.
def fetch_zap_endpoint(profile):
    address = profile.get("lud16")
    if not address:
        raise ValueError("This user has no Lightning address (lud16).")
    url = lnurl_from_address(address)
    if not url:
        raise ValueError("Invalid Lightning address.")
    data = json.loads(urlopen(url, timeout=10).read())
    if data.get("tag") != "payRequest" or not data.get("callback"):
        raise ValueError("Lightning address does not support payments.")
    return data  # {callback, minSendable, maxSendable, allowsNostr, nostrPubkey}


# Steps 3-4: sign the zap request and fetch a bolt11 invoice for `sats`.
def request_zap_invoice(endpoint, priv_hex, recipient_pub, sats, event_id=None, comment=""):
    amount_msat = sats * 1000
    relay_urls = list(DEFAULT_RELAYS)
    zap_request = events.build_zap_request(priv_hex, recipient_pub, amount_msat, relay_urls, event_id, comment)

    params = {"amount": amount_msat}
    if endpoint.get("allowsNostr"):
        params["nostr"] = json.dumps(zap_request)

    separator = "&" if "?" in endpoint["callback"] else "?"
    url = endpoint["callback"] + separator + urlencode(params)
    data = json.loads(urlopen(url, timeout=10).read())
    if not data.get("pr"):
        raise ValueError(data.get("reason", "Could not get an invoice."))
    return {"pr": data["pr"], "zap_request": zap_request}
