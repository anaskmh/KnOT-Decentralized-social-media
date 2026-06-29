// ─────────────────────────────────────────────
// Decrypt incoming direct messages (NIP-04)
// ─────────────────────────────────────────────
// A kind-4 event's content is encrypted to a shared secret between the two
// pubkeys. To read it we decrypt with OUR private key and the OTHER party's
// pubkey — which is the sender (event.pubkey) for messages we received, or
// the recipient (the "p" tag) for messages we sent.
import { decrypt as nip04Decrypt } from "nostr-tools/nip04";
import { hexToBytes } from "nostr-tools/utils";
import { decode as nip19Decode } from "nostr-tools/nip19";

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

// Plain text + a standard "nostr:nevent1…" link (NIP-19/NIP-21) — any Nostr
// client can render this, not just our own. (Older versions of this app sent
// a private JSON blob instead; parseDMShareContent below still reads that
// format so old messages in existing conversations keep rendering.)
export function buildDMShareContent(payload) {
  return payload.caption ? `${payload.caption}\n\n${payload.noteLink}` : payload.noteLink;
}

export function parseDMShareContent(text) {
  if (typeof text !== "string" || !text.trim().startsWith("{")) return null;
  try {
    const payload = JSON.parse(text);
    if (!payload || payload.type !== "share") return null;
    return payload;
  } catch {
    return null;
  }
}

// Other Nostr clients share a post/video as a plain "nostr:nevent1…" (or
// "nostr:note1…") link inside the DM text rather than our own JSON share
// payload. Detect that and decode it to the underlying event id so the
// bubble can fetch the real event and render a rich preview for it too.
const NEVENT_LINK = /nostr:(nevent1[a-z0-9]+|note1[a-z0-9]+)/i;

export function parseSharedEventLink(text) {
  if (typeof text !== "string") return null;
  const match = text.match(NEVENT_LINK);
  if (!match) return null;
  try {
    const { type, data } = nip19Decode(match[1]);
    if (type === "nevent") return { id: data.id };
    if (type === "note") return { id: data };
  } catch {
    return null;
  }
  return null;
}

export function describeDMContent(text) {
  const payload = parseDMShareContent(text);
  if (payload) {
    if (payload.mediaType === "video" || payload.kind === 22) {
      return payload.caption ? `Shared video: ${payload.caption}` : "Shared a video";
    }
    return payload.title ? `Shared: ${payload.title}` : "Shared a post";
  }
  if (parseSharedEventLink(text)) {
    const caption = text.replace(NEVENT_LINK, "").trim();
    return caption ? `Shared video: ${caption}` : "Shared a post";
  }
  return text;
}
