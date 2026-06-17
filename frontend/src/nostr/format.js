// ─────────────────────────────────────────────
// Small display helpers shared across the UI
// ─────────────────────────────────────────────
import { npubEncode } from "nostr-tools/nip19";

// "5s", "3m", "2h", "4d" — the compact timestamps X/KnOT use.
export function timeAgo(createdAt) {
  if (!createdAt || typeof createdAt !== "number") return "";
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - createdAt);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Big numbers like the design: 2100 -> "2.1K", 5400000 -> "5.4M".
export function compactNumber(n) {
  if (typeof n !== "number") return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

// Full npub for a hex pubkey.
export function toNpub(pubHex) {
  if (!pubHex || typeof pubHex !== "string") return "";
  try {
    return npubEncode(pubHex);
  } catch {
    return pubHex;
  }
}

// Short handle, e.g. "npub1abcd…wxyz".
export function shortNpub(pubHex) {
  if (!pubHex || typeof pubHex !== "string") return "";
  const npub = toNpub(pubHex);
  if (!npub || npub.length <= 13) return npub || "";
  return `${npub.slice(0, 9)}…${npub.slice(-4)}`;
}

// A deterministic accent color for an avatar with no picture, derived from
// the pubkey so the same user always gets the same color.
const AVATAR_COLORS = ["#b76dff", "#4cd7f6", "#4edea3", "#facc15", "#ff8fab", "#7c9cff"];
export function avatarColor(pubHex) {
  if (!pubHex || typeof pubHex !== "string") return AVATAR_COLORS[0];
  let sum = 0;
  for (let i = 0; i < pubHex.length; i += 1) sum += pubHex.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Two-character initials for the fallback avatar.
export function avatarInitials(pubHex) {
  if (!pubHex || typeof pubHex !== "string") return "??";
  return pubHex.slice(0, 2).toUpperCase();
}

