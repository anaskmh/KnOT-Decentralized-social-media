"""
Format — small display helpers (mirror of format.js)
----------------------------------------------------
Handy for printing events nicely from a backend script or bot.
"""

import time

from . import keys


# "5s", "3m", "2h", "4d" — compact relative time.
def time_ago(created_at):
    seconds = max(0, int(time.time()) - int(created_at))
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


# 2100 -> "2.1K", 5400000 -> "5.4M"
def compact_number(n):
    if n < 1000:
        return str(n)
    if n < 1_000_000:
        return f"{n / 1000:.1f}".rstrip("0").rstrip(".") + "K"
    return f"{n / 1_000_000:.1f}".rstrip("0").rstrip(".") + "M"


# Full npub for a hex pubkey.
def to_npub(pub_hex):
    return keys.to_npub(pub_hex)


# Short handle, e.g. "npub1abcd…wxyz".
def short_npub(pub_hex):
    npub = keys.to_npub(pub_hex)
    return f"{npub[:9]}…{npub[-4:]}"
