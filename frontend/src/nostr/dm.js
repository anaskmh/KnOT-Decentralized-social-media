// ─────────────────────────────────────────────
// Decrypt incoming direct messages (NIP-04)
// ─────────────────────────────────────────────
// A kind-4 event's content is encrypted to a shared secret between the two
// pubkeys. To read it we decrypt with OUR private key and the OTHER party's
// pubkey — which is the sender (event.pubkey) for messages we received, or
// the recipient (the "p" tag) for messages we sent.
import { decrypt as nip04Decrypt } from "nostr-tools/nip04";
import { hexToBytes } from "nostr-tools/utils";

export async function decryptDM(privHex, myPubHex, event) {
  // Work out who the "other" party is.
  const recipient = event.tags.find((t) => t[0] === "p")?.[1];
  const otherPubkey = event.pubkey === myPubHex ? recipient : event.pubkey;
  try {
    return await nip04Decrypt(hexToBytes(privHex), otherPubkey, event.content);
  } catch {
    return "[unable to decrypt]";
  }
}

// The conversation partner for a DM (the pubkey that isn't me).
export function dmPartner(myPubHex, event) {
  const recipient = event.tags.find((t) => t[0] === "p")?.[1];
  return event.pubkey === myPubHex ? recipient : event.pubkey;
}
