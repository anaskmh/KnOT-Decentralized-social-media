// ─────────────────────────────────────────────
// RightSidebar — search + trends + who-to-follow
// ─────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Icon from "../ui/Icon";
import Avatar from "../ui/Avatar";
import DisplayName from "../ui/DisplayName";
import UserRow from "../UserRow";
import { useFeed } from "../../hooks/useFeed";
import { useNostr } from "../../context/NostrContext";
import { KIND_NOTE, KIND_PROFILE, KIND_CONTACTS } from "../../nostr/events";
import { compactNumber, toNpub } from "../../nostr/format";
import { deriveTrends, deriveAuthors } from "../../nostr/trends";

// Fetch follower counts for a list of pubkeys in one subscription batch.
function useFollowerCounts(pubkeys) {
  const { relay } = useNostr();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!pubkeys.length) return;
    const map = {};
    const unsub = relay.subscribe(
      { kinds: [KIND_CONTACTS], "#p": pubkeys },
      (event) => {
        const tagged = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
        tagged.forEach((pk) => {
          if (pubkeys.includes(pk)) {
            map[pk] = (map[pk] || 0) + 1;
            setCounts({ ...map });
          }
        });
      },
    );
    return unsub;
  }, [relay, pubkeys.join(",")]);

  return counts;
}

export default function RightSidebar() {
  const navigate = useNavigate();
  const { profiles, requestProfile } = useNostr();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sample recent notes for trends + suggestions.
  const { notes } = useFeed({ kinds: [KIND_NOTE], limit: 100 });
  const trends = useMemo(() => deriveTrends(notes, 4), [notes]);
  const suggestions = useMemo(() => deriveAuthors(notes, 3), [notes]);

  // Fetch a pool of profiles for searching (kind-0 events).
  const { notes: profileEvents } = useFeed({ kinds: [KIND_PROFILE], limit: 300 });

  const people = useMemo(() => {
    const byPubkey = new Map();
    for (const event of profileEvents) {
      const existing = byPubkey.get(event.pubkey);
      if (existing && existing.created_at >= event.created_at) continue;
      try {
        byPubkey.set(event.pubkey, {
          ...JSON.parse(event.content),
          pubkey: event.pubkey,
          created_at: event.created_at,
        });
      } catch { /* skip malformed */ }
    }
    return [...byPubkey.values()];
  }, [profileEvents]);

  // Filter people by query.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return people
      .filter((p) =>
        [p.name, p.display_name, p.nip05, p.about, p.pubkey, toNpub(p.pubkey)].some(
          (v) => v && String(v).toLowerCase().includes(q),
        ),
      )
      .slice(0, 8);
  }, [people, query]);

  // Fetch follower counts for visible results.
  const resultPubkeys = useMemo(() => searchResults.map((p) => p.pubkey), [searchResults]);
  const followerCounts = useFollowerCounts(resultPubkeys);

  // Request profiles for results so avatars load.
  useEffect(() => {
    resultPubkeys.forEach(requestProfile);
  }, [resultPubkeys, requestProfile]);

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = focused && query.trim().length > 0;

  const goToProfile = (pubkey) => {
    setFocused(false);
    setQuery("");
    navigate(`/profile/${pubkey}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setFocused(false);
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <aside className="w-[350px] hidden xl:flex flex-col gap-gutter p-edge-margin overflow-y-auto sticky top-0 h-screen custom-scrollbar">

      {/* Search */}
      <div className="relative">
        <form onSubmit={submitSearch} className="relative group">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md transition-all"
            placeholder="Search Nostr Network"
            type="text"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>

        {/* Dropdown results */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-surface-container-low border border-outline-variant rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {/* "Search for …" row */}
            <button
              onClick={submitSearch}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-container transition-colors text-left border-b border-outline-variant"
            >
              <span className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Icon name="search" size={18} className="text-on-surface-variant" />
              </span>
              <span className="text-body-md text-on-surface font-medium">{query}</span>
            </button>

            {/* Profile results */}
            {searchResults.length === 0 ? (
              <div className="px-4 py-5 text-center text-on-surface-variant text-body-md opacity-60">
                No people found for "{query}"
              </div>
            ) : (
              searchResults.map((person) => (
                <button
                  key={person.pubkey}
                  onClick={() => goToProfile(person.pubkey)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-container transition-colors text-left"
                >
                  <Avatar pubkey={person.pubkey} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">
                      {person.display_name || person.name || person.pubkey.slice(0, 12)}
                    </p>
                    {person.nip05 && (
                      <p className="text-on-surface-variant text-body-md truncate">{person.nip05}</p>
                    )}
                  </div>
                  {followerCounts[person.pubkey] > 0 && (
                    <div className="text-right shrink-0">
                      <p className="font-bold text-on-surface text-body-md">{compactNumber(followerCounts[person.pubkey])}</p>
                      <p className="text-on-surface-variant text-mono-label">followers</p>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* What's happening */}
      <section className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant">
        <div className="px-gutter py-3">
          <h3 className="font-h2 text-h2">What's happening</h3>
        </div>
        {trends.length === 0 && (
          <p className="px-gutter pb-3 text-on-surface-variant text-mono-label">Listening for signals…</p>
        )}
        {trends.map((t) => (
          <button
            key={t.tag}
            onClick={() => navigate(`/explore?q=${encodeURIComponent("#" + t.tag)}`)}
            className="block w-full text-left hover:bg-surface-container-highest cursor-pointer px-gutter py-3 transition-opacity"
          >
            <p className="text-on-surface-variant text-mono-label">Trending</p>
            <p className="font-bold text-on-surface mt-0.5">#{t.tag}</p>
            <p className="text-on-surface-variant text-mono-label mt-0.5">{compactNumber(t.count)} notes</p>
          </button>
        ))}
      </section>

      {/* Digital Sovereigns */}
      <section className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant">
        <div className="px-gutter py-3">
          <h3 className="font-h2 text-h2">Digital Sovereigns</h3>
        </div>
        {suggestions.map((pubkey) => (
          <div key={pubkey} className="px-gutter py-3 hover:bg-surface-container-highest">
            <UserRow pubkey={pubkey} compact />
          </div>
        ))}
        <div className="px-gutter py-4">
          <button onClick={() => navigate("/explore")} className="text-primary font-label-sm hover:underline">
            Show more
          </button>
        </div>
      </section>

      <footer className="px-gutter py-4 flex flex-wrap gap-x-4 gap-y-2 text-on-surface-variant text-mono-label opacity-60">
        <span>Terms</span>
        <span>Privacy</span>
        <span>Relay Stats</span>
        <span>© 2024 KNoT Decentralized</span>
      </footer>
    </aside>
  );
}
