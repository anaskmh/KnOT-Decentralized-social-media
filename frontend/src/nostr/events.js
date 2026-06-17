// ─────────────────────────────────────────────
// Build and sign every kind of Nostr event KnOT uses
// ─────────────────────────────────────────────
// Each function fills in a template and calls finalizeEvent(), which adds
// the pubkey, the id (SHA-256) and the Schnorr signature for us.
//
// Kinds reference (NIPs):
//   0    profile metadata           (NIP-01)
//   1    text note                  (NIP-01)
//   3    contact list / follows     (NIP-02)
//   4    encrypted direct message   (NIP-04)
//   6    repost                     (NIP-18)
//   7    reaction / like            (NIP-25)
//   9734 zap request                (NIP-57)
//   10003 bookmark list             (NIP-51)

import { finalizeEvent } from "nostr-tools/pure";
import { encrypt as nip04Encrypt } from "nostr-tools/nip04";
import { hexToBytes } from "nostr-tools/utils";

export const KIND_PROFILE = 0;
export const KIND_NOTE = 1;
export const KIND_CONTACTS = 3;
export const KIND_DM = 4;
export const KIND_REPOST = 6;
export const KIND_REACTION = 7;
export const KIND_ZAP_REQUEST = 9734;
export const KIND_MUTES = 10000;
export const KIND_BOOKMARKS = 10003;

// Small helper so every builder signs the same way.
function sign(privHex, template) {
  return finalizeEvent(template, hexToBytes(privHex));
}

// A plain text note (a "tweet").
export function buildNote(privHex, content) {
  return sign(privHex, {
    kind: KIND_NOTE,
    created_at: now(),
    tags: [],
    content,
  });
}

// A reply note — tags the note + author it replies to (NIP-10).
export function buildReply(privHex, content, replyTo) {
  return sign(privHex, {
    kind: KIND_NOTE,
    created_at: now(),
    tags: [
      ["e", replyTo.id, "", "reply"],
      ["p", replyTo.pubkey],
    ],
    content,
  });
}

// A like / reaction (NIP-25). content "+" is the standard "like".
export function buildReaction(privHex, target, content = "+") {
  return sign(privHex, {
    kind: KIND_REACTION,
    created_at: now(),
    tags: [
      ["e", target.id],
      ["p", target.pubkey],
    ],
    content,
  });
}

// A repost (NIP-18). content is the stringified original event.
export function buildRepost(privHex, target) {
  return sign(privHex, {
    kind: KIND_REPOST,
    created_at: now(),
    tags: [
      ["e", target.id],
      ["p", target.pubkey],
    ],
    content: JSON.stringify(target),
  });
}

// Profile metadata (kind 0). profile = { name, about, picture, banner, ... }.
export function buildProfile(privHex, profile) {
  return sign(privHex, {
    kind: KIND_PROFILE,
    created_at: now(),
    tags: [],
    content: JSON.stringify(profile),
  });
}

// Contact list / follows (NIP-02). pubkeys = array of hex pubkeys.
export function buildContacts(privHex, pubkeys) {
  return sign(privHex, {
    kind: KIND_CONTACTS,
    created_at: now(),
    tags: pubkeys.map((pk) => ["p", pk]),
    content: "",
  });
}

// Mute list (NIP-51 kind 10000). pubkeys = authors whose content we hide.
export function buildMutes(privHex, pubkeys) {
  return sign(privHex, {
    kind: KIND_MUTES,
    created_at: now(),
    tags: pubkeys.map((pk) => ["p", pk]),
    content: "",
  });
}

// Bookmark list (NIP-51 kind 10003). eventIds = array of note ids.
export function buildBookmarks(privHex, eventIds) {
  return sign(privHex, {
    kind: KIND_BOOKMARKS,
    created_at: now(),
    tags: eventIds.map((id) => ["e", id]),
    content: "",
  });
}

// Encrypted direct message (NIP-04). Returns a Promise (encryption is async).
export async function buildDM(privHex, recipientPubHex, text) {
  const ciphertext = await nip04Encrypt(hexToBytes(privHex), recipientPubHex, text);
  return sign(privHex, {
    kind: KIND_DM,
    created_at: now(),
    tags: [["p", recipientPubHex]],
    content: ciphertext,
  });
}

// A zap request (NIP-57). The signed request is what we hand to a Lightning
// wallet's LNURL callback; the wallet pays and the recipient's relay emits a
// kind 9735 zap receipt. amountMsat is millisats.
export function buildZapRequest(privHex, { recipientPubHex, eventId, amountMsat, relays, comment }) {
  const tags = [
    ["p", recipientPubHex],
    ["amount", String(amountMsat)],
    ["relays", ...relays],
  ];
  if (eventId) tags.push(["e", eventId]);
  return sign(privHex, {
    kind: KIND_ZAP_REQUEST,
    created_at: now(),
    tags,
    content: comment || "",
  });
}

function now() {
  return Math.floor(Date.now() / 1000);
}
