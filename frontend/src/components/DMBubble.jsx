// One decrypted DM bubble (NIP-04). Decrypts lazily on mount.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Avatar from "./ui/Avatar";
import DisplayName from "./ui/DisplayName";
import Icon from "./ui/Icon";
import { useNostr } from "../context/NostrContext";
import { useFeed } from "../hooks/useFeed";
import { decryptDM, parseDMShareContent, parseSharedEventLink } from "../nostr/dm";
import { getShortMediaDetails } from "../nostr/video";
import { timeAgo } from "../nostr/format";

export default function DMBubble({ event, onDelete, liked, onToggleLike }) {
  const { identity } = useNostr();
  const [text, setText] = useState("…");
  const [share, setShare] = useState(null);
  const [eventLink, setEventLink] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const mine = event.pubkey === identity.pubHex;

  // Instagram/WhatsApp-style double-tap-to-like, same gesture as ShortCard's
  // double-tap. Always shows the heart pop for feedback even when un-liking.
  const handleDoubleClick = () => {
    onToggleLike?.();
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 700);
  };

  useEffect(() => {
    let alive = true;
    decryptDM(identity.privHex, identity.pubHex, event).then((t) => {
      if (!alive) return;
      setText(t);
      const payload = parseDMShareContent(t);
      setShare(payload);
      // Only look for a raw nevent/note link when it's not our own JSON
      // share payload (which already carries everything it needs).
      setEventLink(payload ? null : parseSharedEventLink(t));
    });
    return () => {
      alive = false;
    };
  }, [event, identity]);

  const isMediaBubble = (share?.mediaType === "video" && share.mediaUrl) || eventLink;

  // What "Copy" should actually copy: the readable link/caption for a share,
  // otherwise the plain decrypted text.
  const copyValue = share ? share.noteLink || share.caption || text : text;
  const copy = () => {
    navigator.clipboard?.writeText(copyValue);
    setMenuOpen(false);
  };
  const remove = () => {
    onDelete?.(event.id);
    setMenuOpen(false);
  };

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} group relative`}>
      {/* Kebab — opens Copy/Delete. Always in the DOM (so it's reachable on
          touch devices with no hover), just faint until hovered/active. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
        className={`self-start mt-1 ${mine ? "order-first mr-1" : "ml-1"} opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-on-surface-variant`}
        title="Message options"
      >
        <Icon name="more_vert" size={16} />
      </button>

      <div className="relative max-w-[75%]">
        {menuOpen && (
          <div
            className={`absolute z-10 top-0 ${mine ? "right-full mr-1" : "left-full ml-1"} bg-surface-container-high border border-outline-variant rounded-lg shadow-lg overflow-hidden text-label-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={copy} type="button" className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-container-low text-on-surface whitespace-nowrap">
              <Icon name="content_copy" size={16} /> Copy
            </button>
            <button onClick={remove} type="button" className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-container-low text-error whitespace-nowrap">
              <Icon name="delete" size={16} /> Delete
            </button>
          </div>
        )}

        <div
          onDoubleClick={handleDoubleClick}
          className={
            isMediaBubble
              ? "relative"
              : `relative rounded-xl px-3 py-2 text-body-md ${
                  mine ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface"
                }`
          }
        >
          {share ? (
            <SharedDMPreview payload={share} />
          ) : eventLink ? (
            <SharedEventLinkPreview eventId={eventLink.id} fallbackText={text} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{text}</p>
          )}
          <p
            className={`text-[10px] mt-1 flex items-center gap-1 ${
              isMediaBubble
                ? "text-on-surface-variant"
                : mine
                  ? "text-on-primary-container/70"
                  : "text-on-surface-variant"
            }`}
          >
            {timeAgo(event.created_at)}
            {liked && <Icon name="favorite" fill size={11} className="text-like-red" />}
          </p>

          {/* Big heart pop on double-tap, Instagram-style — fades out on its own. */}
          {showHeartPop && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Icon name="favorite" fill size={56} className="text-like-red drop-shadow-lg animate-ping" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Resolve a bare "nostr:nevent1…"/"nostr:note1…" link (the format other
// clients use when sharing) into the real event, then render it the same
// way as our own share payloads.
function SharedEventLinkPreview({ eventId, fallbackText }) {
  const { notes, loading } = useFeed({ ids: [eventId] });
  const note = notes[0];

  if (!note) {
    if (loading) {
      return <p className="text-on-surface-variant text-body-md">Loading shared post…</p>;
    }
    // Couldn't resolve it from any connected relay — fall back to the raw link.
    return <p className="whitespace-pre-wrap break-words">{fallbackText}</p>;
  }

  if (note.kind === 22) {
    const media = getShortMediaDetails(note);
    if (media?.url) {
      return (
        <MediaSharePreview eventId={note.id} pubkey={note.pubkey} mediaUrl={media.url} posterUrl={media.posterUrl} />
      );
    }
  }

  return (
    <div className="w-64 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <Avatar pubkey={note.pubkey} size={20} />
        <DisplayName pubkey={note.pubkey} className="font-bold text-on-surface text-label-sm" />
      </div>
      <p className="text-body-md text-on-surface-variant line-clamp-4 whitespace-pre-wrap break-words">
        {note.content}
      </p>
    </div>
  );
}

function SharedDMPreview({ payload }) {
  if (payload.mediaType !== "video" || !payload.mediaUrl) {
    return (
      <p className="whitespace-pre-wrap break-words">
        {payload.caption || payload.title || "Shared post"}
      </p>
    );
  }
  return (
    <MediaSharePreview eventId={payload.id} pubkey={payload.pubkey} mediaUrl={payload.mediaUrl} posterUrl={payload.posterUrl} />
  );
}

// The video thumbnail card — author overlay + play icon — shared by both our
// own JSON share payloads and links resolved from other clients. Tapping it
// opens the actual short full-screen instead of playing inline.
function MediaSharePreview({ eventId, pubkey, mediaUrl, posterUrl }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const open = (e) => {
    e.stopPropagation();
    if (eventId) navigate(`/shorts/${eventId}`);
  };

  return (
    <div className="relative w-56 overflow-hidden rounded-xl bg-black cursor-pointer" onClick={open}>
      <video
        ref={videoRef}
        src={mediaUrl}
        poster={posterUrl || undefined}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          // No poster tag on most kind-22 events — nudge the playhead so the
          // browser decodes and paints a frame instead of leaving it black.
          if (!posterUrl) e.currentTarget.currentTime = 0.1;
        }}
        className="h-72 w-full object-cover"
      />

      {/* Author overlay — top-left, over the thumbnail */}
      <div className="absolute left-0 top-0 right-0 flex items-center gap-2 p-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <Avatar pubkey={pubkey} size={24} />
        <DisplayName pubkey={pubkey} className="font-bold text-white text-label-sm drop-shadow" />
      </div>

      {/* Tap-to-open hint */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="bg-black/40 rounded-full p-3">
          <Icon name="play_arrow" fill size={28} className="text-white" />
        </span>
      </div>
    </div>
  );
}
