// ─────────────────────────────────────────────
// FollowList — who follows a profile / who it follows
// ─────────────────────────────────────────────
// One component for both screens; `mode` ("followers" | "following") comes
// from the route. Each person resolves their own kind-0 profile via UserRow.
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import UserRow from "../components/UserRow";
import { useNostr, useProfile } from "../context/NostrContext";
import { useDisplayName } from "../components/ui/DisplayName";
import { useFollowList } from "../hooks/useFollowList";
import { shortNpub } from "../nostr/format";

export default function FollowList({ mode }) {
  const { pubkey: routePubkey } = useParams();
  const navigate = useNavigate();
  const { identity, profiles } = useNostr();
  const pubkey = routePubkey || identity.pubHex;

  const ownerName = useDisplayName(pubkey);
  const { pubkeys, loading } = useFollowList(pubkey, mode);
  const [filter, setFilter] = useState("");

  // Filter by name / npub / bio of the people in the list.
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return pubkeys;
    return pubkeys.filter((pk) => {
      const p = profiles[pk];
      const hay = [p?.name, p?.display_name, p?.nip05, p?.about, shortNpub(pk)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [pubkeys, filter, profiles]);

  const title = mode === "followers" ? "Followers" : "Following";

  return (
    <>
      <header className="sticky top-0 z-40 glass-header border-b border-outline-variant px-edge-margin py-3">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => navigate(-1)} className="hover:bg-surface-variant/50 p-2 rounded-full">
            <Icon name="arrow_back" />
          </button>
          <div className="min-w-0">
            <h1 className="font-h2 text-h2 text-on-surface">{title}</h1>
            <p className="text-on-surface-variant text-sm truncate">
              {ownerName} · {pubkeys.length} accounts
            </p>
          </div>
        </div>
        <div className="relative group">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={mode === "followers" ? "Search followers" : "Search followed users"}
            className="block w-full pl-11 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-full text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-on-surface-variant/50"
          />
        </div>
      </header>

      <div className="divide-y divide-outline-variant">
        {loading && pubkeys.length === 0 ? (
          <div className="p-10 flex justify-center text-on-surface-variant opacity-40">
            <Icon name="progress_activity" className="animate-spin" size={32} />
          </div>
        ) : shown.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-8 opacity-50">
            <Icon name="group" size={64} className="mb-4" />
            <p className="font-body-lg">
              {pubkeys.length === 0
                ? mode === "followers"
                  ? "No followers yet."
                  : "Not following anyone yet."
                : "No accounts match your search."}
            </p>
          </div>
        ) : (
          <>
            {shown.map((pk) => (
              <UserRow key={pk} pubkey={pk} />
            ))}
            <div className="py-12 flex flex-col items-center justify-center text-center px-8 opacity-50">
              <Icon name="group" size={64} className="mb-4" />
              <p className="font-body-lg">You've reached the end of the list.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
