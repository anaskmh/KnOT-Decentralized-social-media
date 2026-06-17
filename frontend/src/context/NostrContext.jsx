// ─────────────────────────────────────────────
// NostrContext — global app state
// ─────────────────────────────────────────────
// Everything every screen needs:
//   • identity            the logged-in keypair
//   • relay (RelayPool)   the 4 relays, with publish()/subscribe()
//   • profiles            a cache of kind-0 metadata (name, picture, …)
//   • follows             my contact list (NIP-02 kind 3)
//   • bookmarks           my bookmarked note ids (NIP-51 kind 10003)
// plus helpers to follow/unfollow, bookmark/unbookmark, and request profiles.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// localStorage key for the timestamp of the last time the user opened /notifications
const NOTIF_SEEN_KEY = "knot_notif_seen_at";
const NOTIF_PREFS_KEY = "knot_notif_prefs";

// Map each pref key → the Nostr event kind(s) it controls.
const PREF_KIND_MAP = {
  followers: [3],
  zaps:      [9735],
  reactions: [7],
  reposts:   [6],
  replies:   [1],
  mentions:  [1],
};

function loadNotifPrefs() {
  try {
    const defaults = { followers: true, zaps: true, reactions: true, reposts: true, replies: true, mentions: true };
    return { ...defaults, ...JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}") };
  } catch { return { followers: true, zaps: true, reactions: true, reposts: true, replies: true, mentions: true }; }
}

// Build the kinds array from current prefs (deduplicated).
function kindsFromPrefs(prefs) {
  const set = new Set();
  for (const [key, kinds] of Object.entries(PREF_KIND_MAP)) {
    if (prefs[key]) kinds.forEach((k) => set.add(k));
  }
  return [...set];
}

import { RelayPool } from "../nostr/relay";
import {
  loadIdentity,
  createIdentity,
  importIdentity,
  clearIdentity,
} from "../nostr/keys";
import {
  buildContacts,
  buildBookmarks,
  buildMutes,
  KIND_PROFILE,
  KIND_CONTACTS,
  KIND_BOOKMARKS,
  KIND_MUTES,
} from "../nostr/events";

// Moderation settings, kept in localStorage (defaults are the safe choice).
const SETTINGS_KEY = "knot_settings";
const DEFAULT_SETTINGS = { hideSensitive: true, blurMedia: true };

const NostrContext = createContext(null);

export function NostrProvider({ children }) {
  const [identity, setIdentity] = useState(() => loadIdentity());

  // One relay pool for the whole app (KnOT + Damus + Primal + nos.lol).
  const relay = useMemo(() => new RelayPool(), []);
  const [relayStatuses, setRelayStatuses] = useState(() => relay.statuses());

  // kind-0 metadata cache: { [pubkey]: { name, picture, about, banner, nip05 } }
  const [profiles, setProfiles] = useState({});
  // my follows + bookmarks (+ the created_at of the newest list applied,
  // so stale versions from slower relays can never overwrite a newer one)
  const [follows, setFollows] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [mutes, setMutes] = useState([]);
  const followsTime = useRef(0);
  const bookmarksTime = useRef(0);
  const mutesTime = useRef(0);

  // ── Live notifications ────────────────────────────────────────
  // Keeps a permanent open subscription for events that tag your pubkey.
  // Counts events newer than the last time the user visited /notifications.
  // Re-subscribes whenever the user changes notification prefs.
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs);
  const notifSeen = useRef(parseInt(localStorage.getItem(NOTIF_SEEN_KEY) || "0", 10));

  // Called by SettingsNotifications when prefs change so we re-subscribe.
  const updateNotifPrefs = useCallback((next) => {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
    setNotifPrefs(next);
  }, []);

  const markNotificationsRead = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    notifSeen.current = now;
    localStorage.setItem(NOTIF_SEEN_KEY, String(now));
    setUnreadCount(0);
  }, []);

  // Moderation settings (hide sensitive notes, blur untrusted media).
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
  }));
  const updateSetting = useCallback((key, value) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Connect the pool once.
  useEffect(() => {
    relay.onStatusChange = setRelayStatuses;
    relay.connect();
  }, [relay]);

  // ── Batched profile fetching ──────────────────────────────────
  // Collect pubkeys we want metadata for and fetch them together every
  // 300ms, so a feed of 50 notes makes ONE request, not 50.
  const pendingProfiles = useRef(new Set());
  const requestedProfiles = useRef(new Set());
  const flushTimer = useRef(null);

  const flushProfiles = useCallback(() => {
    const authors = [...pendingProfiles.current];
    pendingProfiles.current.clear();
    if (authors.length === 0) return;

    relay.subscribe({ kinds: [KIND_PROFILE], authors }, (event) => {
      try {
        const meta = JSON.parse(event.content);
        setProfiles((current) => {
          // Keep the newest metadata event per author.
          const existing = current[event.pubkey];
          if (existing && existing._created_at >= event.created_at) return current;
          return { ...current, [event.pubkey]: { ...meta, _created_at: event.created_at } };
        });
      } catch {
        /* ignore malformed profiles */
      }
    });
  }, [relay]);

  const requestProfile = useCallback(
    (pubkey) => {
      if (!pubkey || requestedProfiles.current.has(pubkey)) return;
      requestedProfiles.current.add(pubkey);
      pendingProfiles.current.add(pubkey);
      clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flushProfiles, 300);
    },
    [flushProfiles],
  );

  // ── Load MY follows + bookmarks whenever I log in ─────────────
  useEffect(() => {
    if (!identity) {
      setFollows([]);
      setBookmarks([]);
      return;
    }
    requestProfile(identity.pubHex);
    followsTime.current = 0;
    bookmarksTime.current = 0;
    mutesTime.current = 0;

    // Each relay sends ITS stored version of the list — they can differ and
    // arrive in any order, so only ever apply an event NEWER than what we have.
    const unsubFollows = relay.subscribe(
      { kinds: [KIND_CONTACTS], authors: [identity.pubHex], limit: 1 },
      (event) => {
        if (event.created_at <= followsTime.current) return;
        followsTime.current = event.created_at;
        setFollows(event.tags.filter((t) => t[0] === "p").map((t) => t[1]));
      },
    );
    const unsubBookmarks = relay.subscribe(
      { kinds: [KIND_BOOKMARKS], authors: [identity.pubHex], limit: 1 },
      (event) => {
        if (event.created_at <= bookmarksTime.current) return;
        bookmarksTime.current = event.created_at;
        setBookmarks(event.tags.filter((t) => t[0] === "e").map((t) => t[1]));
      },
    );
    const unsubMutes = relay.subscribe(
      { kinds: [KIND_MUTES], authors: [identity.pubHex], limit: 1 },
      (event) => {
        if (event.created_at <= mutesTime.current) return;
        mutesTime.current = event.created_at;
        setMutes(event.tags.filter((t) => t[0] === "p").map((t) => t[1]));
      },
    );

    return () => {
      unsubFollows();
      unsubBookmarks();
      unsubMutes();
    };
  }, [identity, relay, requestProfile]);

  // ── Live notification subscription ───────────────────────────
  // Stays open permanently (unlike useFeed which closes after EOSE) so
  // any like/reply/repost/zap/follow from another client arrives immediately.
  useEffect(() => {
    if (!identity) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const kinds = kindsFromPrefs(notifPrefs);
    if (kinds.length === 0) return; // all notification types disabled

    const seenIds = new Set();

    const unsub = relay.subscribe(
      { kinds, "#p": [identity.pubHex], limit: 50 },
      (event) => {
        if (event.pubkey === identity.pubHex) return;
        if (seenIds.has(event.id)) return;
        seenIds.add(event.id);

        // Filter by prefs at the event level (kind 1 covers both replies & mentions).
        const pref = notifPrefs;
        if (event.kind === 7  && !pref.reactions) return;
        if (event.kind === 6  && !pref.reposts)   return;
        if (event.kind === 3  && !pref.followers)  return;
        if (event.kind === 9735 && !pref.zaps)    return;
        if (event.kind === 1) {
          const isReply = event.tags?.some((t) => t[0] === "e");
          if (isReply  && !pref.replies)  return;
          if (!isReply && !pref.mentions) return;
        }

        setNotifications((prev) =>
          [event, ...prev].sort((a, b) => b.created_at - a.created_at).slice(0, 100),
        );

        if (event.created_at > notifSeen.current) {
          setUnreadCount((n) => n + 1);
        }
      },
    );

    return unsub;
  }, [identity, relay, notifPrefs]);

  // ── Follow / unfollow (republish the whole kind-3 list) ───────
  const isFollowing = useCallback((pubkey) => follows.includes(pubkey), [follows]);

  const toggleFollow = useCallback(
    (pubkey) => {
      const next = follows.includes(pubkey)
        ? follows.filter((p) => p !== pubkey)
        : [...follows, pubkey];
      setFollows(next);
      const event = buildContacts(identity.privHex, next);
      followsTime.current = event.created_at;   // our update is now the newest
      relay.publish(event);
    },
    [follows, identity, relay],
  );

  // ── Mute / unmute an author (republish the kind-10000 list) ───
  const isMuted = useCallback((pubkey) => mutes.includes(pubkey), [mutes]);

  const toggleMute = useCallback(
    (pubkey) => {
      const next = mutes.includes(pubkey)
        ? mutes.filter((p) => p !== pubkey)
        : [...mutes, pubkey];
      setMutes(next);
      const event = buildMutes(identity.privHex, next);
      mutesTime.current = event.created_at;
      relay.publish(event);
    },
    [mutes, identity, relay],
  );

  // ── Bookmark / unbookmark (republish the whole kind-10003 list) ─
  const isBookmarked = useCallback((id) => bookmarks.includes(id), [bookmarks]);

  const toggleBookmark = useCallback(
    (eventId) => {
      const next = bookmarks.includes(eventId)
        ? bookmarks.filter((id) => id !== eventId)
        : [...bookmarks, eventId];
      setBookmarks(next);
      const event = buildBookmarks(identity.privHex, next);
      bookmarksTime.current = event.created_at;
      relay.publish(event);
    },
    [bookmarks, identity, relay],
  );

  // ── Auth ──────────────────────────────────────────────────────
  const login = (input) => setIdentity(importIdentity(input));
  const signup = () => {
    const id = createIdentity();
    setIdentity(id);
    return id;
  };
  const logout = () => {
    clearIdentity();
    setIdentity(null);
  };

  const value = {
    identity,
    relay,
    relayStatuses,
    profiles,
    requestProfile,
    follows,
    isFollowing,
    toggleFollow,
    bookmarks,
    isBookmarked,
    toggleBookmark,
    mutes,
    isMuted,
    toggleMute,
    settings,
    updateSetting,
    login,
    signup,
    logout,
    setIdentity,
    notifications,
    unreadCount,
    markNotificationsRead,
    notifPrefs,
    updateNotifPrefs,
  };

  return <NostrContext.Provider value={value}>{children}</NostrContext.Provider>;
}

export function useNostr() {
  return useContext(NostrContext);
}

// Convenience hook: get (and lazily request) a profile by pubkey.
export function useProfile(pubkey) {
  const { profiles, requestProfile } = useNostr();
  useEffect(() => {
    if (pubkey) requestProfile(pubkey);
  }, [pubkey, requestProfile]);
  return profiles[pubkey] || null;
}
