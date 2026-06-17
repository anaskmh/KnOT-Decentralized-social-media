// ─────────────────────────────────────────────
// Notifications — live activity feed for your pubkey
// ─────────────────────────────────────────────
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import NoteCard from "../components/NoteCard";
import { useDisplayName } from "../components/ui/DisplayName";
import { useNostr } from "../context/NostrContext";
import { timeAgo } from "../nostr/format";

const META = {
  1: { emoji: "💬", label: "replied to your note" },
  3: { emoji: "👤", label: "followed you" },
  6: { emoji: "🔁", label: "reposted your note" },
  7: { emoji: "❤️",  label: "liked your note" },
  9735: { emoji: "⚡", label: "zapped your note" },
};

export default function Notifications() {
  const { notifications, unreadCount, markNotificationsRead } = useNostr();

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

      {notifications.length === 0 ? (
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
  const name = useDisplayName(event.pubkey);
  const meta = META[event.kind] || { emoji: "🔔", label: "interacted with you" };

  // For likes/reposts/replies, find the note id they acted on (first "e" tag).
  const referencedNoteId = event.tags?.find((t) => t[0] === "e")?.[1] ?? null;

  const handleRowClick = () => {
    if (event.kind === 3) {
      // Follow — go to that person's profile
      navigate(`/profile/${event.pubkey}`);
    } else if (referencedNoteId) {
      // Like / repost / reply / zap — go to the thread
      navigate(`/note/${referencedNoteId}`);
    }
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    navigate(`/profile/${event.pubkey}`);
  };

  return (
    <div
      onClick={handleRowClick}
      className="flex gap-3 p-4 border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer"
    >
      <span className="text-2xl mt-0.5">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <button onClick={handleAvatarClick} className="mb-1">
          <Avatar pubkey={event.pubkey} size={36} />
        </button>
        <p className="mt-2 text-body-md">
          <span className="font-bold text-on-surface">{name}</span>{" "}
          <span className="text-on-surface-variant">
            {meta.label} · {timeAgo(event.created_at)}
          </span>
        </p>
      </div>
    </div>
  );
}
