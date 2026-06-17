// ─────────────────────────────────────────────
// useFollowList — the actual pubkeys behind a profile's follow counts
// ─────────────────────────────────────────────
//   mode "following" → the "p" tags in THIS user's contact list (kind 3)
//   mode "followers" → every distinct author whose kind-3 list "p"-tags them
import { useEffect, useRef, useState } from "react";

import { useNostr } from "../context/NostrContext";
import { KIND_CONTACTS } from "../nostr/events";

export function useFollowList(pubkey, mode) {
  const { relay } = useNostr();
  const [pubkeys, setPubkeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const newestContacts = useRef(0); // for "following": keep the latest list

  useEffect(() => {
    if (!pubkey) return undefined;
    setPubkeys([]);
    setLoading(true);
    newestContacts.current = 0;

    const filter =
      mode === "followers"
        ? { kinds: [KIND_CONTACTS], "#p": [pubkey] }
        : { kinds: [KIND_CONTACTS], authors: [pubkey], limit: 1 };

    const seen = new Set();
    const unsubscribe = relay.subscribe(
      filter,
      (event) => {
        if (mode === "followers") {
          // Each follower is the AUTHOR of a contact list tagging us.
          if (seen.has(event.pubkey)) return;
          seen.add(event.pubkey);
          setPubkeys((cur) => [...cur, event.pubkey]);
        } else {
          // "following": take the p-tags from the newest contact list.
          if (event.created_at <= newestContacts.current) return;
          newestContacts.current = event.created_at;
          setPubkeys(event.tags.filter((t) => t[0] === "p").map((t) => t[1]));
        }
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [relay, pubkey, mode]);

  return { pubkeys, loading };
}
