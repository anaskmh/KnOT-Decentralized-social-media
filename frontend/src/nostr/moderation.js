// ─────────────────────────────────────────────
// Content moderation helpers
// ─────────────────────────────────────────────
// On Nostr nobody can delete content from the network — moderation happens
// in the CLIENT: we decide what to show. Two signals mark a note sensitive:
//
//   1. The author labeled it themselves (NIP-36): a ["content-warning", …]
//      tag, or hashtags like #nsfw. Good clients respect those labels.
//   2. Our own keyword screen catches unlabeled adult text.
//
// Sensitive notes aren't dropped — they collapse behind a "Show" button so
// the user stays in control.

// Words that mark a note as adult content. Matched on word boundaries to
// avoid false positives (e.g. "sussex" must not match "sex").
const SENSITIVE_WORDS = [
  "nsfw",
  "porn",
  "xxx",
  "nude",
  "nudes",
  "explicit",
  "onlyfans",
  "hentai",
  "sex",
  "18+",
];

const SENSITIVE_REGEX = new RegExp(
  `(^|\\W)(${SENSITIVE_WORDS.map((w) => w.replace("+", "\\+")).join("|")})($|\\W)`,
  "i",
);

// Did the author label this note sensitive (NIP-36)?
export function contentWarningReason(event) {
  const tag = event.tags?.find((t) => t[0] === "content-warning");
  return tag ? tag[1] || "sensitive content" : null;
}

// Full check: author label OR our keyword screen.
// Returns a human-readable reason, or null if the note looks fine.
export function sensitiveReason(event) {
  const labeled = contentWarningReason(event);
  if (labeled) return labeled;
  if (SENSITIVE_REGEX.test(event.content || "")) return "may contain adult content";
  return null;
}
