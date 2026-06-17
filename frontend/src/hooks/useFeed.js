// ─────────────────────────────────────────────
// useFeed — fetch a one-shot batch of notes from relays
// ─────────────────────────────────────────────
// Used by the Home feed, Profile, Explore, Bookmarks, Notifications…
// Returns { notes, loading, refresh }. Newest first, de-duplicated by id.
//
// We close the subscription as soon as EOSE arrives so the relay stops
// pushing new events. This prevents the feed from jumping constantly.
// Call refresh() (or wait for the auto-refresh interval) to pull again.
import { useCallback, useEffect, useRef, useState } from "react";

import { useNostr } from "../context/NostrContext";

// How often (ms) the feed silently re-fetches in the background.
const AUTO_REFRESH_MS = 30_000; // 30 seconds

export function useFeed(filter, { enabled = true } = {}) {
  const { relay } = useNostr();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  // revision counter — incrementing it triggers a fresh fetch
  const [rev, setRev] = useState(0);
  const seen = useRef(new Set());

  const filterKey = JSON.stringify(filter);

  const refresh = useCallback(() => {
    setRev((r) => r + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !filter) return undefined;

    seen.current = new Set();
    setNotes([]);
    setLoading(true);

    const unsubRef = { fn: null };

    unsubRef.fn = relay.subscribe(
      filter,
      (event) => {
        if (seen.current.has(event.id)) return;
        seen.current.add(event.id);
        setNotes((current) =>
          [...current, event].sort((a, b) => b.created_at - a.created_at),
        );
      },
      () => {
        // EOSE received — all stored events delivered. Close subscription
        // so the relay stops streaming live events into the feed.
        unsubRef.fn?.();
        setLoading(false);
      },
    );

    return () => unsubRef.fn?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay, filterKey, enabled, rev]);

  // Auto-refresh every AUTO_REFRESH_MS so the feed stays reasonably fresh
  // without an always-open subscription.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled, refresh]);

  return { notes, loading, refresh };
}
