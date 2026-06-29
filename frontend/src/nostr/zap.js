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
import { decodeInvoice } from "./bolt11";

// A zap receipt's own `pubkey` is the LNURL provider/relay that published it,
// NOT the person who paid — the real zapper is inside the embedded kind-9734
// zap request, JSON-encoded in the receipt's "description" tag. For an
// anonymous zap that inner request carries a "P" tag instead of a real pubkey.
export function getZapperPubkey(receipt) {
  const description = receipt.tags?.find((t) => t[0] === "description")?.[1];
  if (!description) return receipt.pubkey;
  try {
    const zapRequest = JSON.parse(description);
    return zapRequest.tags?.find((t) => t[0] === "P")?.[1] || zapRequest.pubkey || receipt.pubkey;
  } catch {
    return receipt.pubkey;
  }
}

// How many sats a single kind-9735 zap receipt is worth. Other clients show
// the TOTAL SATS zapped on a note, not the number of zappers — summing this
// across a note's receipts is what makes our count match theirs.
//
// Two sources, in order of reliability:
//   1. the "amount" tag (millisats) inside the embedded kind-9734 zap request
//      in the receipt's "description" — the recipient asked for exactly this.
//   2. the bolt11 invoice in the receipt's "bolt11" tag — decode its amount.
export function getZapAmountSats(receipt) {
  const description = receipt.tags?.find((t) => t[0] === "description")?.[1];
  if (description) {
    try {
      const zapRequest = JSON.parse(description);
      const amountMsat = zapRequest.tags?.find((t) => t[0] === "amount")?.[1];
      if (amountMsat) return Math.floor(Number(amountMsat) / 1000);
    } catch {
      /* fall through to the bolt11 invoice */
    }
  }

  const bolt11 = receipt.tags?.find((t) => t[0] === "bolt11")?.[1];
  if (bolt11) {
    const decoded = decodeInvoice(bolt11);
    if (decoded?.amountSats != null) return decoded.amountSats;
  }

  return 0;
}

// Turn "name@domain.com" (lud16) into its LNURL-pay URL.
export function lnurlFromAddress(address) {
  const [name, domain] = address.split("@");
  if (!name || !domain) return null;
  return `https://${domain}/.well-known/lnurlp/${name}`;
}

// Resolve any "name@domain.com" Lightning address to its LNURL-pay params.
export async function fetchLnurlEndpoint(address) {
  const url = lnurlFromAddress(address);
  if (!url) throw new Error("Invalid Lightning address.");

  const res = await fetch(url);
  const data = await res.json();
  if (data.tag !== "payRequest" || !data.callback) {
    throw new Error("Lightning address does not support payments.");
  }
  return data; // { callback, minSendable, maxSendable, allowsNostr, nostrPubkey }
}

// Step 2: fetch the LNURL-pay parameters for a recipient profile.
export async function fetchZapEndpoint(profile) {
  const address = profile?.lud16;
  if (!address) throw new Error("This user has no Lightning address (lud16) in their profile.");
  return fetchLnurlEndpoint(address);
}

// Plain (non-zap) Lightning-address payment: resolve the address and ask its
// callback for a bolt11 invoice for `sats`, with no kind-9734 zap request
// attached — for the wallet Send flow, paying any address with no Nostr note involved.
export async function fetchAddressInvoice(address, sats, comment) {
  const endpoint = await fetchLnurlEndpoint(address);
  const amountMsat = sats * 1000;
  if (endpoint.minSendable && amountMsat < endpoint.minSendable) {
    throw new Error(`Minimum is ${Math.ceil(endpoint.minSendable / 1000)} sats.`);
  }
  if (endpoint.maxSendable && amountMsat > endpoint.maxSendable) {
    throw new Error(`Maximum is ${Math.floor(endpoint.maxSendable / 1000)} sats.`);
  }

  const callback = new URL(endpoint.callback);
  callback.searchParams.set("amount", String(amountMsat));
  if (comment && endpoint.commentAllowed) callback.searchParams.set("comment", comment);

  const res = await fetch(callback.toString());
  const data = await res.json();
  if (!data.pr) throw new Error(data.reason || "Could not get an invoice.");
  return data.pr;
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
