// ─────────────────────────────────────────────
// useShortsFeed — fetch short-form videos (NIP-71 kind 22)
// ─────────────────────────────────────────────
// Mirrors useFeed, but specialised for the Shorts reel: it only keeps events
// that actually carry a playable video URL, newest-first, deduped by id.
import { useCallback, useEffect, useRef, useState } from "react";

import { useNostr } from "../context/NostrContext";
import { KIND_VIDEO_SHORT } from "../nostr/events";
import { getShortVideoUrl } from "../nostr/video";

const LIMIT = 50;

function makeSeed() {
  return Math.random().toString(36).slice(2);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sortBySessionOrder(items, seed) {
  return [...items].sort((a, b) => {
    const sa = hashString(`${seed}:${a.id}`);
    const sb = hashString(`${seed}:${b.id}`);
    return sa - sb;
  });
}

export function useShortsFeed() {
  const { relay } = useNostr();
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [rev, setRev] = useState(0);
  const [page, setPage] = useState(0);
  const seen = useRef(new Set());
  const oldestCursorRef = useRef(null);
  const orderSeedRef = useRef(makeSeed());

  const refresh = useCallback(() => {
    seen.current = new Set();
    oldestCursorRef.current = null;
    orderSeedRef.current = makeSeed();
    setShorts([]);
    setHasMore(true);
    setPage(0);
    setRev((r) => r + 1);
    setLoading(true);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
  }, [hasMore, loadingMore]);

  useEffect(() => {
    let alive = true;
    const batch = [];
    let rawCount = 0;
    const until = page === 0 ? undefined : oldestCursorRef.current;
    const filter = until != null
      ? { kinds: [KIND_VIDEO_SHORT], limit: LIMIT, until }
      : { kinds: [KIND_VIDEO_SHORT], limit: LIMIT };

    const unsubRef = { fn: null };
    unsubRef.fn = relay.subscribe(
      filter,
      (event) => {
        rawCount += 1;
        if (seen.current.has(event.id)) return;
        if (!getShortVideoUrl(event)) return; // no playable video — skip
        seen.current.add(event.id);
        batch.push(event);
      },
      () => {
        if (!alive) return;

        const next = batch.sort((a, b) => b.created_at - a.created_at);
        if (next.length > 0) {
          const oldest = next[next.length - 1].created_at;
          oldestCursorRef.current = Math.max(0, oldest - 1);
        }

        setShorts((current) => {
          if (page === 0) return sortBySessionOrder(next, orderSeedRef.current);
          const byId = new Map(current.map((short) => [short.id, short]));
          next.forEach((short) => byId.set(short.id, short));
          return sortBySessionOrder([...byId.values()], orderSeedRef.current);
        });

        if (rawCount < LIMIT) setHasMore(false);
        unsubRef.fn?.();
        setLoading(false);
        setLoadingMore(false);
      },
    );

    return () => {
      alive = false;
      unsubRef.fn?.();
    };
  }, [relay, rev, page]);

  return { shorts, loading, loadingMore, hasMore, refresh, loadMore };
}
