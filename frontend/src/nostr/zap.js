// ─────────────────────────────────────────────
// Zaps (NIP-57) — Lightning tipping
// ─────────────────────────────────────────────
// The real zap flow:
//   1. read the recipient's lightning address (lud16) from their profile
//   2. resolve its LNURL-pay endpoint to get a callback URL
//   3. sign a kind-9734 "zap request" event
//   4. ask the callback for a Lightning invoice (bolt11) for the amount
//   5. the user pays that invoice with any wallet; the recipient's relay
//      then publishes a kind-9735 "zap receipt"
//
// We do steps 1-4 here and hand the invoice to the UI. Paying is done by the
// user's Lightning wallet (we never touch their funds).
import { buildZapRequest } from "./events";
import { DEFAULT_RELAYS } from "./relay";

// Turn "name@domain.com" (lud16) into its LNURL-pay URL.
function lnurlFromAddress(address) {
  const [name, domain] = address.split("@");
  if (!name || !domain) return null;
  return `https://${domain}/.well-known/lnurlp/${name}`;
}

// Step 2: fetch the LNURL-pay parameters for a recipient profile.
export async function fetchZapEndpoint(profile) {
  const address = profile?.lud16;
  if (!address) throw new Error("This user has no Lightning address (lud16) in their profile.");
  const url = lnurlFromAddress(address);
  if (!url) throw new Error("Invalid Lightning address.");

  const res = await fetch(url);
  const data = await res.json();
  if (data.tag !== "payRequest" || !data.callback) {
    throw new Error("Lightning address does not support payments.");
  }
  return data; // { callback, minSendable, maxSendable, allowsNostr, nostrPubkey }
}

// Steps 3-4: sign the zap request and fetch a bolt11 invoice for `sats`.
// Returns BOTH the invoice and the signed zap request — the wallet needs the
// zap request so a kind-9735 receipt can be tied back to the zapped note.
export async function requestZapInvoice({ endpoint, privHex, recipientPubHex, eventId, sats, comment }) {
  if (!endpoint) throw new Error("Missing LNURL endpoint.");
  const amountMsat = sats * 1000;

  const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
  const zapRequest = buildZapRequest(privHex, {
    recipientPubHex,
    eventId,
    amountMsat,
    relays: relayUrls,
    comment,
  });

  const callback = new URL(endpoint.callback);
  callback.searchParams.set("amount", String(amountMsat));
  if (endpoint.allowsNostr) {
    callback.searchParams.set("nostr", JSON.stringify(zapRequest));
  }

  const res = await fetch(callback.toString());
  const data = await res.json();
  if (!data.pr) throw new Error(data.reason || "Could not get an invoice.");
  return { pr: data.pr, zapRequest };
}
