"""
Moderation — sensitive-content detection (mirror of moderation.js)
------------------------------------------------------------------
Two signals mark a note as adult content:
    1. the author labeled it (NIP-36 "content-warning" tag)
    2. our own keyword screen catches unlabeled text

Returns a human-readable reason, or None if the note looks fine. Nothing is
deleted — the client decides to hide/collapse based on this.
"""

import re

SENSITIVE_WORDS = [
    "nsfw", "porn", "xxx", "nude", "nudes",
    "explicit", "onlyfans", "hentai", "sex", "18+",
]

# Match on word boundaries so "sussex" doesn't trip "sex".
_PATTERN = re.compile(
    r"(^|\W)(" + "|".join(w.replace("+", r"\+") for w in SENSITIVE_WORDS) + r")($|\W)",
    re.IGNORECASE,
)


# Did the author label this note sensitive (NIP-36)?
def content_warning_reason(event):
    tag = next((t for t in event.get("tags", []) if t and t[0] == "content-warning"), None)
    if not tag:
        return None
    return tag[1] if len(tag) > 1 and tag[1] else "sensitive content"


# Full check: author label OR keyword screen. None = looks fine.
def sensitive_reason(event):
    labeled = content_warning_reason(event)
    if labeled:
        return labeled
    if _PATTERN.search(event.get("content", "") or ""):
        return "may contain adult content"
    return None
