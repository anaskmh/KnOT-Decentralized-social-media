// ─────────────────────────────────────────────
// Notifications — live activity feed for your pubkey
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import NoteCard from "../components/NoteCard";
import { useDisplayName } from "../components/ui/DisplayName";
import { useNostr, useProfileLoading } from "../context/NostrContext";
import { timeAgo } from "../nostr/format";
import { getZapperPubkey } from "../nostr/zap";

const META = {
  1: { emoji: "💬", label: "replied to your note" },
  3: { emoji: "👤", label: "followed you" },
  6: { emoji: "🔁", label: "reposted your note" },
  7: { emoji: "❤️",  label: "liked your note" },
  9735: { emoji: "⚡", label: "zapped your note" },
};

// Briefly hold the loader on the FIRST open after a full page load (browser
// refresh / fresh tab) so the one-time merge flicker is hidden. Set false after
// that first mount, so navigating away and back later is instant (no loader) —
// by then everything is already cached and loaded.
const MIN_LOADING_MS = 400;
let firstOpenThisPageLoad = true;

export default function Notifications() {
  const { notifications, notificationsLoading, unreadCount, markNotificationsRead } = useNostr();

  // Only the very first Notifications mount of this page load gets the minimum
  // loader; a browser refresh re-runs this module so the flag resets to true,
  // while client-side back-and-forth keeps it false.
  const [minLoading, setMinLoading] = useState(firstOpenThisPageLoad);
  useEffect(() => {
    // After the first mount of this page load, later client-side visits skip
    // the loader entirely (minLoading starts false). The timer always runs so
    // it reliably clears even under StrictMode's mount→cleanup→mount cycle;
    // when minLoading is already false it's just a harmless no-op.
    firstOpenThisPageLoad = false;
    const t = setTimeout(() => setMinLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);
  const showLoading = notificationsLoading || minLoading;

  // Mark all as read when the user opens this page.
  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <>
      <Header
        title={
          <span className="flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </span>
        }
      />

      {showLoading ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="progress_activity" size={40} className="animate-spin" />
          <p className="text-body-md">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="notifications_off" size={40} />
          <p className="text-body-md">No notifications yet.</p>
          <p className="text-mono-label text-center opacity-70">
            Likes, replies, reposts and follows will appear here in real time.
          </p>
        </div>
      ) : (
        notifications.map((event) =>
          event.kind === 1 ? (
            <NoteCard key={event.id} note={event} />
          ) : (
            <NotificationRow key={event.id} event={event} />
          ),
        )
      )}
    </>
  );
}

function NotificationRow({ event }) {
  const navigate = useNavigate();
  // A zap receipt's own pubkey is the LNURL provider, not the zapper — the
  // real zapper is embedded in the receipt's "description" tag.
  const fromPubkey = event.kind === 9735 ? getZapperPubkey(event) : event.pubkey;
  const name = useDisplayName(fromPubkey);
  const nameLoading = useProfileLoading(fromPubkey);
  const meta = META[event.kind] || { emoji: "🔔", label: "interacted with you" };

  // For likes/reposts/replies, find the note id they acted on (first "e" tag).
  const referencedNoteId = event.tags?.find((t) => t[0] === "e")?.[1] ?? null;

  const handleRowClick = () => {
    if (event.kind === 3) {
      // Follow — go to that person's profile
      navigate(`/profile/${fromPubkey}`);
    } else if (referencedNoteId) {
      // Like / repost / reply / zap — go to the thread
      navigate(`/note/${referencedNoteId}`);
    }
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    navigate(`/profile/${fromPubkey}`);
  };

  return (
    <div
      onClick={handleRowClick}
      className="flex gap-3 p-4 border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer"
    >
      <span className="text-2xl mt-0.5">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <button onClick={handleAvatarClick} className="mb-1">
          <Avatar pubkey={fromPubkey} size={36} />
        </button>
        <p className="mt-2 text-body-md">
          {nameLoading ? (
            <span className="inline-block h-3.5 w-20 rounded bg-surface-container-high animate-pulse align-middle" />
          ) : (
            <span className="font-bold text-on-surface">{name}</span>
          )}{" "}
          <span className="text-on-surface-variant">
            {meta.label} · {timeAgo(event.created_at)}
          </span>
        </p>
      </div>
    </div>
  );
}
