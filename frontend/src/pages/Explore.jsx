// ─────────────────────────────────────────────
// Explore / Search — discover notes, hashtags, people (from search_discover)
// ─────────────────────────────────────────────
// Searches a live sample of recent notes client-side. If you paste an
// npub/hex it jumps straight to that profile.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import Icon from "../components/ui/Icon";
import NoteCard from "../components/NoteCard";
import UserRow from "../components/UserRow";
import { useFeed } from "../hooks/useFeed";
import { useNostr } from "../context/NostrContext";
import { KIND_NOTE, KIND_PROFILE } from "../nostr/events";
import { toNpub } from "../nostr/format";
import { deriveTrends } from "../nostr/trends";
import { decode } from "nostr-tools/nip19";

// If the query is a full npub or 64-char hex pubkey, return its hex form.
function queryToPubkey(query) {
  const q = query.trim();
  if (q.startsWith("npub1")) {
    try {
      return decode(q).data;
    } catch {
      return null;
    }
  }
  if (/^[0-9a-f]{64}$/i.test(q)) return q.toLowerCase();
  return null;
}

const TABS = ["For You", "Trending", "People", "Media"];
const IMAGE = /https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|avif)/i;

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = params.get("q") || "";
  const { follows } = useNostr();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState("For You");

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  // Pull a generous sample of recent notes to search through.
  const { notes, loading } = useFeed({ kinds: [KIND_NOTE], limit: 200 });

  // Pull recent kind-0 profiles so we can search PEOPLE by name.
  const profileEvents = useFeed({ kinds: [KIND_PROFILE], limit: 300 });

  // Always load the profiles of everyone I FOLLOW, so people in my own social
  // graph are searchable by name even if they're not in the recent sample and
  // aren't indexed by the relays' NIP-50 search.
  const followProfiles = useFeed(
    follows.length ? { kinds: [KIND_PROFILE], authors: follows, limit: 1000 } : null,
    { enabled: follows.length > 0 },
  );

  // Fix 2: if the query is an exact npub/hex, fetch THAT profile directly from
  // the relays — so it's found even when it isn't in the recent sample.
  const directPubkey = useMemo(() => queryToPubkey(query), [query]);
  const directProfile = useFeed(
    directPubkey ? { kinds: [KIND_PROFILE], authors: [directPubkey], limit: 1 } : null,
    { enabled: Boolean(directPubkey) },
  );

  // Debounce the typed name so we don't fire a fresh relay subscription on
  // every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Relay-side name search (NIP-50): ask search-capable relays (nostr.band,
  // search.nos.today…) for kind-0 profiles matching the typed name. This is
  // what makes searching a person by name actually work — the recent sample
  // above only contains whoever happened to stream in, so anyone outside it
  // would never be found without this.
  const nameQuery = debouncedQuery.trim().replace(/^@/, "");
  const searchProfiles = useFeed(
    nameQuery && !directPubkey ? { kinds: [KIND_PROFILE], search: nameQuery, limit: 50 } : null,
    { enabled: Boolean(nameQuery) && !directPubkey },
  );

  const people = useMemo(() => {
    // Keep only the newest profile per pubkey (streamed sample + direct fetch).
    const byPubkey = new Map();
    for (const event of [...profileEvents.notes, ...followProfiles.notes, ...directProfile.notes, ...searchProfiles.notes]) {
      const existing = byPubkey.get(event.pubkey);
      if (existing && existing.created_at >= event.created_at) continue;
      try {
        byPubkey.set(event.pubkey, { ...JSON.parse(event.content), pubkey: event.pubkey, created_at: event.created_at });
      } catch { /* skip malformed profiles */ }
    }
    return [...byPubkey.values()];
  }, [profileEvents.notes, followProfiles.notes, directProfile.notes, searchProfiles.notes]);

  // People whose name / handle / bio / PUBKEY / npub matches the query.
  const peopleResults = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    let list = !q
      ? people.slice(0, 30) // People tab with no query: show recent
      : people
          .filter((p) =>
            // Fix 1: pubkey + npub are now searchable, not just name/bio.
            [p.name, p.display_name, p.nip05, p.about, p.pubkey, toNpub(p.pubkey)].some(
              (v) => v && String(v).toLowerCase().includes(q),
            ),
          )
          .slice(0, 30);

    // Always surface an exact key match, even if its profile has no metadata.
    if (directPubkey && !list.some((p) => p.pubkey === directPubkey)) {
      const known = people.find((p) => p.pubkey === directPubkey);
      list = [known || { pubkey: directPubkey }, ...list];
    }
    return list;
  }, [people, query, directPubkey]);

  const trends = useMemo(() => deriveTrends(notes), [notes]);

  const results = useMemo(() => {
    let list = notes;
    if (tab === "Media") list = list.filter((n) => IMAGE.test(n.content));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((n) => n.content.toLowerCase().includes(q.replace(/^#/, "#")));
    return list;
  }, [notes, query, tab]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    // npub / hex pubkey → go to profile
    if (q.startsWith("npub1")) {
      try {
        const { data } = decode(q);
        return navigate(`/profile/${data}`);
      } catch { /* fall through */ }
    }
    if (/^[0-9a-f]{64}$/i.test(q)) return navigate(`/profile/${q}`);
    setParams(q ? { q } : {});
  };

  return (
    <>
      {/* Search header */}
      <div className="sticky top-0 z-40 glass-header border-b border-outline-variant p-gutter">
        <form onSubmit={submit} className="relative group">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KnOT Protocol"
            className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
          />
        </form>
        <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition-colors ${
                tab === t ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Trending → hashtags · People → profile results · others → notes */}
      {tab === "Trending" && !query ? (
        <div className="flex flex-col">
          <h3 className="font-h2 text-h2 px-gutter py-4">Discovery Channels</h3>
          {trends.map((t) => (
            <button
              key={t.tag}
              onClick={() => { setTab("For You"); setQuery(`#${t.tag}`); setParams({ q: `#${t.tag}` }); }}
              className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant hover:bg-surface-container-low text-left"
            >
              <div>
                <p className="text-on-surface-variant text-mono-label">Channel</p>
                <p className="font-bold text-primary">#{t.tag}</p>
              </div>
              <span className="text-on-surface-variant text-mono-label">{t.count} notes</span>
            </button>
          ))}
        </div>
      ) : tab === "People" ? (
        <div className="flex flex-col">
          {peopleResults.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
              <Icon name="person_search" size={40} />
              <p className="text-body-md">No people match “{query}”.</p>
            </div>
          ) : (
            peopleResults.map((person) => <UserRow key={person.pubkey} pubkey={person.pubkey} />)
          )}
        </div>
      ) : (
        <>
          {query && (
            <p className="px-gutter py-3 text-on-surface-variant text-body-md border-b border-outline-variant">
              Results for <span className="text-primary font-bold">{query}</span>
            </p>
          )}

          {/* Top people matches first, like X does */}
          {query && peopleResults.length > 0 && (
            <div className="border-b border-outline-variant">
              <h3 className="font-bold text-on-surface px-gutter pt-3">People</h3>
              {peopleResults.slice(0, 3).map((person) => (
                <UserRow key={person.pubkey} pubkey={person.pubkey} />
              ))}
              {peopleResults.length > 3 && (
                <button onClick={() => setTab("People")} className="px-gutter pb-3 text-primary text-label-sm font-bold hover:underline">
                  View all people
                </button>
              )}
            </div>
          )}

          {loading && results.length === 0 ? (
            <div className="p-10 flex justify-center text-on-surface-variant opacity-40">
              <Icon name="progress_activity" className="animate-spin" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
              <Icon name="search_off" size={40} />
              <p className="text-body-md">No notes match your search.</p>
            </div>
          ) : (
            results.map((note) => <NoteCard key={note.id} note={note} />)
          )}
        </>
      )}
    </>
  );
}

