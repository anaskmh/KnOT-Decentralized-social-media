// ─────────────────────────────────────────────
// useEngagement — live counts for one note
// ─────────────────────────────────────────────
// Subscribes to every event that references this note (#e tag) and tallies
// replies (kind 1), reposts (kind 6), likes (kind 7) and zaps (kind 9735).
// Also reports whether the logged-in user has already liked / reposted it.
import { useEffect, useMemo, useState } from "react";

import { useNostr } from "../context/NostrContext";
import {
  KIND_NOTE,
  KIND_REPOST,
  KIND_REACTION,
} from "../nostr/events";

const KIND_ZAP_RECEIPT = 9735;

export function useEngagement(note) {
  const { relay, identity } = useNostr();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!note?.id) return undefined;
    const seen = new Set();
    const unsubscribe = relay.subscribe(
      { kinds: [KIND_NOTE, KIND_REPOST, KIND_REACTION, KIND_ZAP_RECEIPT], "#e": [note.id] },
      (event) => {
        if (seen.has(event.id)) return;
        seen.add(event.id);
        setEvents((cur) => [...cur, event]);
      },
    );
    return () => {
      unsubscribe();
      setEvents([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay, note?.id]);

  return useMemo(() => {
    let replies = 0;
    let reposts = 0;
    let likes = 0;
    let zaps = 0;
    let liked = false;
    let reposted = false;

    for (const e of events) {
      if (e.kind === KIND_NOTE) replies += 1;
      else if (e.kind === KIND_REPOST) {
        reposts += 1;
        if (e.pubkey === identity?.pubHex) reposted = true;
      } else if (e.kind === KIND_REACTION) {
        likes += 1;
        if (e.pubkey === identity?.pubHex) liked = true;
      } else if (e.kind === KIND_ZAP_RECEIPT) zaps += 1;
    }

    return { replies, reposts, likes, zaps, liked, reposted };
  }, [events, identity?.pubHex]);
}
