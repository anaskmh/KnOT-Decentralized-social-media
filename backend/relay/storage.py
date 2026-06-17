"""
Relay storage (SQLite) + NIP-01 filter matching
------------------------------------------------
A relay only has to do two things with events:

    1. SAVE   an event when a client publishes it
    2. SEARCH stored events when a client subscribes with a filter

We keep every event as one row in a small SQLite table, plus the raw JSON
so we can hand the exact original event back to clients.

No external install needed – sqlite3 ships with Python.
"""

import json
import sqlite3
import time


class Storage:

    def __init__(self, db_path="events.db"):
        # check_same_thread=False lets the async relay touch the DB freely.
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self._create_table()

    # ─────────────────────────────────────────────
    # Create the events table (once)
    # ─────────────────────────────────────────────
    def _create_table(self):
        self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id          TEXT PRIMARY KEY,
                pubkey      TEXT,
                created_at  INTEGER,
                kind        INTEGER,
                tags        TEXT,
                content     TEXT,
                raw         TEXT
            )
            """
        )
        self.db.commit()

    # ─────────────────────────────────────────────
    # Save one event
    # ─────────────────────────────────────────────
    # Returns True if it was newly stored, False if we already had it.
    def save_event(self, event):
        try:
            self.db.execute(
                "INSERT INTO events (id, pubkey, created_at, kind, tags, content, raw) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    event["id"],
                    event["pubkey"],
                    event["created_at"],
                    event["kind"],
                    # No spaces in the JSON, so tag searches can match it
                    # with a simple LIKE '%["e","<id>"%' pattern.
                    json.dumps(event["tags"], separators=(",", ":")),
                    event["content"],
                    json.dumps(event),
                ),
            )
            self.db.commit()
            return True
        except sqlite3.IntegrityError:
            # Same id already exists → relays simply ignore duplicates.
            return False

    # ─────────────────────────────────────────────
    # Find events that match a filter (NIP-01)
    # ─────────────────────────────────────────────
    # A filter can contain: ids, authors, kinds, since, until, limit,
    # and tag filters like "#e" / "#p". We build a SQL WHERE clause from it.
    def query_events(self, filters):
        where = []
        params = []

        if "ids" in filters:
            where.append(self._in_clause("id", filters["ids"], params))

        if "authors" in filters:
            where.append(self._in_clause("pubkey", filters["authors"], params))

        if "kinds" in filters:
            placeholders = ",".join("?" for _ in filters["kinds"])
            where.append(f"kind IN ({placeholders})")
            params.extend(filters["kinds"])

        if "since" in filters:
            where.append("created_at >= ?")
            params.append(filters["since"])

        if "until" in filters:
            where.append("created_at <= ?")
            params.append(filters["until"])

        # Tag filters: keys that start with "#", e.g. "#e": [event_ids].
        # We match against the tags JSON. Rows written before we compacted
        # the JSON have a space after the comma, so check both spellings.
        for key, values in filters.items():
            if key.startswith("#") and isinstance(values, list):
                tag_name = key[1:]
                tag_or = []
                for value in values:
                    tag_or.append("tags LIKE ?")
                    params.append(f'%["{tag_name}","{value}"%')
                    tag_or.append("tags LIKE ?")
                    params.append(f'%["{tag_name}", "{value}"%')
                if tag_or:
                    where.append("(" + " OR ".join(tag_or) + ")")

        sql = "SELECT raw FROM events"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY created_at DESC"

        # limit defaults to 100 so a broad filter can't dump the whole DB.
        limit = filters.get("limit", 100)
        sql += " LIMIT ?"
        params.append(limit)

        rows = self.db.execute(sql, params).fetchall()
        return [json.loads(row[0]) for row in rows]

    # Helper: build an "col IN (?,?,?)" clause and push its params.
    def _in_clause(self, column, values, params):
        placeholders = ",".join("?" for _ in values)
        params.extend(values)
        return f"{column} IN ({placeholders})"


# ─────────────────────────────────────────────
# In-memory matching (for LIVE subscriptions)
# ─────────────────────────────────────────────
# When a brand-new event arrives we must decide, in Python, whether it
# matches each open subscription's filter — without touching the DB.

def event_matches_filter(event, filters):
    if "ids" in filters and event["id"] not in filters["ids"]:
        return False
    if "authors" in filters and event["pubkey"] not in filters["authors"]:
        return False
    if "kinds" in filters and event["kind"] not in filters["kinds"]:
        return False
    if "since" in filters and event["created_at"] < filters["since"]:
        return False
    if "until" in filters and event["created_at"] > filters["until"]:
        return False

    for key, values in filters.items():
        if key.startswith("#") and isinstance(values, list):
            tag_name = key[1:]
            event_tag_values = [t[1] for t in event["tags"] if len(t) >= 2 and t[0] == tag_name]
            if not any(v in event_tag_values for v in values):
                return False

    return True
