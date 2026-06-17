// ─────────────────────────────────────────────
// useFollowCounts — live following / followers numbers
// ─────────────────────────────────────────────
// following = how many "p" tags are in THIS user's contact list (kind 3).
// followers = how many distinct users have a kind-3 list that "p"-tags them.
import { useEffect, useState } from "react";

import { useNostr } from "../context/NostrContext";
import { KIND_CONTACTS } from "../nostr/events";

export function useFollowCounts(pubkey) {
  const { relay } = useNostr();
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!pubkey) return undefined;
    const followerSet = new Set();

    const unsubFollowing = relay.subscribe(
      { kinds: [KIND_CONTACTS], authors: [pubkey], limit: 1 },
      (event) => setFollowing(event.tags.filter((t) => t[0] === "p").length),
    );
    const unsubFollowers = relay.subscribe(
      { kinds: [KIND_CONTACTS], "#p": [pubkey] },
      (event) => {
        followerSet.add(event.pubkey);
        setFollowers(followerSet.size);
      },
    );

    return () => {
      unsubFollowing();
      unsubFollowers();
    };
  }, [relay, pubkey]);

  return { following, followers };
}
