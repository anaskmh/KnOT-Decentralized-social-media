// ─────────────────────────────────────────────
// Keypair management (browser side)
// ─────────────────────────────────────────────
// In Nostr your identity IS your keypair. KnOT keeps it simple:
//   - generate 32 random bytes  → private key
//   - derive the x-only pubkey  → public key
//   - store both in localStorage so you stay logged in
//   - show them as npub / nsec  (NIP-19 bech32 encoding)
//
// This is fine for learning. A production client would use a NIP-07
// browser extension so the private key never touches the web page.

import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { npubEncode, nsecEncode, decode } from "nostr-tools/nip19";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";

const STORAGE_KEY = "knot_identity";

// Create a brand-new identity (keypair).
export function createIdentity() {
  const secretKey = generateSecretKey();        // Uint8Array (32 bytes)
  const privHex = bytesToHex(secretKey);
  const pubHex = getPublicKey(secretKey);
  return saveIdentity(privHex, pubHex);
}

// Log in with an existing nsec or raw hex private key.
export function importIdentity(input) {
  let privHex;
  if (input.startsWith("nsec")) {
    const { data } = decode(input);             // data is a Uint8Array
    privHex = bytesToHex(data);
  } else {
    privHex = input.trim();
  }
  const pubHex = getPublicKey(hexToBytes(privHex));
  return saveIdentity(privHex, pubHex);
}

// Build the identity object and persist it.
function saveIdentity(privHex, pubHex) {
  const identity = {
    privHex,
    pubHex,
    npub: npubEncode(pubHex),
    nsec: nsecEncode(hexToBytes(privHex)),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

// Load the saved identity on page refresh (or null if logged out).
export function loadIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate identity structure before returning
    if (parsed && typeof parsed === "object" && parsed.pubHex && parsed.privHex) {
      return parsed;
    }
    // If parsed object is corrupt/invalid, remove it to prevent app crashes
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearIdentity() {
  localStorage.removeItem(STORAGE_KEY);
}

// (shortNpub lives in format.js — the single source used across the app.)
