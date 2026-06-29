// ─────────────────────────────────────────────
// ShortCard — one full-screen vertical video in the reel
// ─────────────────────────────────────────────
// Autoplays (muted) when scrolled into view, pauses when it leaves. The right
// rail reuses the app's real engagement: like (kind 7), comment (kind 1
// replies), zap (NIP-57) and share — all keyed off this video event's id.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Icon from "../ui/Icon";
import Avatar from "../ui/Avatar";
import DisplayName from "../ui/DisplayName";
import ZapModal from "../ZapModal";
import PeopleModal from "../PeopleModal";
import ShareModal from "../ShareModal";
import ShortComments from "./ShortComments";
import { useNostr } from "../../context/NostrContext";
import { useEngagement } from "../../hooks/useEngagement";
import { buildReaction } from "../../nostr/events";
import { getShortVideoUrl, getShortCaption } from "../../nostr/video";
import { compactNumber } from "../../nostr/format";

export default function ShortCard({ short, muted, onToggleMute }) {
  const navigate = useNavigate();
  const { identity, relay } = useNostr();
  const engagement = useEngagement(short);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const activeRef = useRef(false); // is this card the one in view right now?
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [zapOpen, setZapOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const url = getShortVideoUrl(short);
  const caption = getShortCaption(short);

  // Start playback only if this card is still the active (in-view) one.
  // Called both from the observer and from the video's own "ready" events so
  // the first/visible card still autoplays even if the observer fired before
  // the video had loaded enough data to play.
  const tryPlay = () => {
    const video = videoRef.current;
    if (!video || !activeRef.current) return;
    video.play().then(() => setPlaying(true)).catch(() => {});
  };

  // Memory is kept in check by windowing alone: when a card scrolls out of the
  // render window React unmounts its <video> element, and the browser frees the
  // decoded buffer once it's removed from the DOM. (We deliberately do NOT strip
  // the src in a cleanup — StrictMode's mount→cleanup→mount cycle would wipe the
  // source off a still-mounted card, leaving it blank.)

  // Play only the card that's mostly on screen; pause + rewind the rest.
  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          activeRef.current = true;
          tryPlay();
        } else {
          activeRef.current = false;
          video.pause();
          video.currentTime = 0;
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  };

  const like = (e) => {
    e?.stopPropagation?.();
    if (!engagement.liked) relay.publish(buildReaction(identity.privHex, short));
  };
  const openLikers = (e) => {
    e.stopPropagation();
    if (engagement.likers.length > 0) setLikersOpen(true);
  };
  const handleVideoClick = (e) => {
    if (e.detail !== 1) return;
    togglePlay();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden"
      onDoubleClick={(e) => {
        e.stopPropagation();
        like();
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={url}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onWaiting={() => setBuffering(true)}
        onLoadedData={() => { setBuffering(false); tryPlay(); }}
        onCanPlay={() => { setBuffering(false); tryPlay(); }}
        onPlaying={() => setBuffering(false)}
        onClick={handleVideoClick}
        className="h-full w-full object-contain"
      />

      {/* Spinner while the clip is still loading — so a slow reel reads as
          "loading" instead of a black screen that looks like a hang. */}
      {buffering && !playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Icon name="progress_activity" className="animate-spin text-white/80" size={36} />
        </div>
      )}

      {/* Tap-to-play hint when paused (and not just buffering) */}
      {!playing && !buffering && (
        <button
          onClick={togglePlay}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute inset-0 flex items-center justify-center"
          type="button"
        >
          <span className="bg-black/40 rounded-full p-4">
            <Icon name="play_arrow" fill size={40} className="text-white" />
          </span>
        </button>
      )}

      {/* Mute toggle — shared across all reels, so muting/unmuting one applies to all */}
      <button
        onClick={onToggleMute}
        onDoubleClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white"
        title={muted ? "Unmute" : "Mute"}
        type="button"
      >
        <Icon name={muted ? "volume_off" : "volume_up"} size={20} />
      </button>

      {/* Author + caption — bottom-left */}
      <div className="absolute left-0 bottom-0 p-4 pr-20 w-full bg-gradient-to-t from-black/70 to-transparent">
        <button
          onClick={() => navigate(`/profile/${short.pubkey}`)}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 mb-2"
          type="button"
        >
          <Avatar pubkey={short.pubkey} size={36} />
          <DisplayName pubkey={short.pubkey} className="font-bold text-white text-label-sm" />
        </button>
        {caption && <p className="text-white text-body-md line-clamp-3 drop-shadow">{caption}</p>}
      </div>

      {/* Scrim behind the right rail so the actions stay legible over any
          video — bright/portrait clips otherwise wash the buttons out. */}
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />

      {/* Right rail — like / comment / zap / share */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-5 text-white">
        <ActionButton
          icon="favorite"
          fill={engagement.liked}
          colorClass={engagement.liked ? "text-like-red" : "text-white"}
          count={engagement.likes}
          onClick={like}
          onCountClick={openLikers}
        />
        <ActionButton icon="chat_bubble" count={engagement.replies} onClick={() => setCommentsOpen(true)} />
        <ActionButton icon="bolt" fill colorClass="text-tertiary-fixed" count={engagement.zapSats} onClick={() => setZapOpen(true)} />
        <ActionButton icon="share" onClick={() => setShareOpen(true)} />
      </div>

      {commentsOpen && <ShortComments short={short} onClose={() => setCommentsOpen(false)} />}
      {zapOpen && <ZapModal note={short} onClose={() => setZapOpen(false)} />}
      {shareOpen && <ShareModal note={short} onClose={() => setShareOpen(false)} />}
      {likersOpen && (
        <PeopleModal
          title={`${compactNumber(engagement.likes)} Likes`}
          pubkeys={engagement.likers}
          onClose={() => setLikersOpen(false)}
        />
      )}
    </div>
  );
}

function ActionButton({ icon, count, onClick, onCountClick, fill = false, colorClass = "text-white" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        onDoubleClick={(e) => e.stopPropagation()}
        className="active:scale-90 transition-transform"
        type="button"
      >
        <Icon name={icon} fill={fill} size={26} className={`${colorClass} drop-shadow-lg`} />
      </button>
      {count != null && (
        onCountClick ? (
          <button
            onClick={onCountClick}
            onDoubleClick={(e) => e.stopPropagation()}
            className="text-mono-label font-bold drop-shadow-lg hover:opacity-80 transition-opacity"
            title="View likes"
            type="button"
          >
            {compactNumber(count)}
          </button>
        ) : (
          <span className="text-mono-label font-bold drop-shadow-lg">{compactNumber(count)}</span>
        )
      )}
    </div>
  );
}
