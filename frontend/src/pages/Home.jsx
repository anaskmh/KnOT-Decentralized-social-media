// ─────────────────────────────────────────────
// Home — composer + live global timeline
// ─────────────────────────────────────────────
import { useState } from "react";

import Header from "../components/ui/Header";
import Composer from "../components/Composer";
import Feed from "../components/Feed";
import { useNostr } from "../context/NostrContext";
import { KIND_NOTE } from "../nostr/events";

export default function Home() {
  const { follows } = useNostr();
  const [tab, setTab] = useState("global"); // "global" | "following"

  // "Following" filters to people in your contact list (NIP-02).
  const filter =
    tab === "following" && follows.length > 0
      ? { kinds: [KIND_NOTE], authors: follows, limit: 50 }
      : { kinds: [KIND_NOTE], limit: 50 };

  return (
    <>
      <Header title="Home" />

      {/* Global / Following tabs */}
      <div className="flex border-b border-outline-variant glass-header sticky top-14 z-30">
        {[
          { id: "global", label: "Global" },
          { id: "following", label: "Following" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-3 font-bold text-label-sm relative hover:bg-surface-container-low transition-colors"
          >
            <span className={tab === t.id ? "text-on-surface" : "text-on-surface-variant"}>{t.label}</span>
            {tab === t.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <Composer />

      <Feed
        filter={filter}
        emptyText={
          tab === "following" && follows.length === 0
            ? "You're not following anyone yet. Explore to find sovereigns."
            : "No signals yet. Be the first to broadcast."
        }
      />
    </>
  );
}
