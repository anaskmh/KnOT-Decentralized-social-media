// ─────────────────────────────────────────────
// NoteCard — one note, rendered + fully interactive
// ─────────────────────────────────────────────
// Reply / repost / like / zap / bookmark / share all hit real Nostr events.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import DisplayName, { Handle } from "./ui/DisplayName";
import NoteContent from "./ui/NoteContent";
import ReplyModal from "./ReplyModal";
import ZapModal from "./ZapModal";
import PeopleModal from "./PeopleModal";
import ShareModal from "./ShareModal";
import { useNostr, useProfile } from "../context/NostrContext";
import { useEngagement } from "../hooks/useEngagement";
import { buildReaction, buildRepost } from "../nostr/events";
import { timeAgo, compactNumber } from "../nostr/format";
import { sensitiveReason } from "../nostr/moderation";
import { noteEncode } from "nostr-tools/nip19";

export default function NoteCard({ note, threadLine = false, indent = false }) {
  const navigate = useNavigate();
  const { identity, relay, isBookmarked, toggleBookmark, isFollowing, toggleMute, settings } = useNostr();
  const profile = useProfile(note.pubkey);
  const engagement = useEngagement(note);

  const [replyOpen, setReplyOpen] = useState(false);
  const [zapOpen, setZapOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const bookmarked = isBookmarked(note.id);
  const isMine = note.pubkey === identity?.pubHex;

  // Moderation: collapse sensitive notes; blur media from strangers.
  const reason = sensitiveReason(note);
  const blurMedia = settings.blurMedia && !isMine && !isFollowing(note.pubkey);

  if (reason && settings.hideSensitive && !revealed) {
    return (
      <div className="p-gutter border-b border-outline-variant flex items-center gap-3 text-on-surface-variant">
        <Icon name="visibility_off" size={20} />
        <p className="flex-1 text-body-md">
          This note is hidden — {reason}.
        </p>
        <button
          onClick={() => setRevealed(true)}
          className="border border-outline text-on-surface px-4 py-1.5 rounded-full font-bold text-label-sm hover:bg-surface-container-high shrink-0"
        >
          Show
        </button>
      </div>
    );
  }

  const like = (e) => {
    e.stopPropagation();
    if (!engagement.liked) relay.publish(buildReaction(identity.privHex, note));
  };
  const openLikers = (e) => {
    e.stopPropagation();
    if (engagement.likers.length > 0) setLikersOpen(true);
  };
  const repost = (e) => {
    e.stopPropagation();
    if (!engagement.reposted) relay.publish(buildRepost(identity.privHex, note));
  };
  const share = (e) => {
    e.stopPropagation();
    setShareOpen(true);
  };
  const openProfile = (e) => {
    e.stopPropagation();
    navigate(`/profile/${note.pubkey}`);
  };

  return (
    <>
      <article
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => navigate(`/note/${note.id}`)}
        className="p-gutter border-b border-outline-variant transition-colors cursor-pointer relative"
        style={{ backgroundColor: hover ? "rgba(38,38,38,0.4)" : "transparent" }}
      >
        <div className={`flex gap-3 ${indent ? "pl-6" : ""}`}>
          <div className="flex-shrink-0 relative">
            <button onClick={openProfile}>
              <Avatar pubkey={note.pubkey} size={40} />
            </button>
            {threadLine && <div className="thread-line" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <button onClick={openProfile}>
                <DisplayName pubkey={note.pubkey} className="font-bold text-on-surface truncate hover:underline" />
              </button>
              {profile?.nip05 && (
                <Icon name="verified" fill className="text-primary" size={16} />
              )}
              <Handle pubkey={note.pubkey} className="text-on-surface-variant text-body-md ml-1 truncate" />
              <span className="text-on-surface-variant text-body-md">· {timeAgo(note.created_at)}</span>
            </div>

            <NoteContent text={note.content} blurMedia={blurMedia} />

            {/* Engagement row */}
            <div className="flex justify-between items-center mt-3 text-on-surface-variant max-w-sm">
              <button onClick={(e) => { e.stopPropagation(); setReplyOpen(true); }} className="flex items-center gap-2 transition-colors hover:text-secondary" type="button">
                <Icon name="chat_bubble" size={18} />
                <span className="text-mono-label font-mono-label">{compactNumber(engagement.replies)}</span>
              </button>

              <button onClick={repost} className={`flex items-center gap-2 transition-colors repost-hover ${engagement.reposted ? "text-repost-green" : ""}`} type="button">
                <Icon name="repeat" size={18} />
                <span className="text-mono-label font-mono-label">{compactNumber(engagement.reposts)}</span>
              </button>

              <div className="flex items-center gap-1">
                <button onClick={like} className={`flex items-center gap-2 transition-colors like-hover ${engagement.liked ? "text-like-red" : ""}`} type="button">
                  <Icon name="favorite" fill={engagement.liked} size={18} />
                </button>
                {engagement.likes > 0 ? (
                  <button
                    onClick={openLikers}
                    className="text-mono-label font-mono-label hover:text-on-surface transition-colors"
                    title="View likes"
                    type="button"
                  >
                    {compactNumber(engagement.likes)}
                  </button>
                ) : (
                  <span className="text-mono-label font-mono-label">{compactNumber(engagement.likes)}</span>
                )}
              </div>

              <button onClick={(e) => { e.stopPropagation(); setZapOpen(true); }} className="flex items-center gap-2 transition-colors zap-hover" type="button">
                <Icon name="bolt" fill className="text-tertiary-fixed" size={18} />
                <span className="text-mono-label font-mono-label text-tertiary-fixed">{compactNumber(engagement.zapSats)}</span>
              </button>

              <button onClick={(e) => { e.stopPropagation(); toggleBookmark(note.id); }} className="hover:text-primary" type="button">
                <Icon name="bookmark" fill={bookmarked} size={18} className={bookmarked ? "text-primary" : ""} />
              </button>

              <button onClick={share} className="hover:text-primary transition-colors" title="Share" type="button">
                <Icon name="share" size={18} />
              </button>

              {!isMine && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(note.pubkey); }}
                  title="Mute this author"
                  className="hover:text-error"
                  type="button"
                >
                  <Icon name="person_off" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {replyOpen && <ReplyModal note={note} onClose={() => setReplyOpen(false)} />}
      {zapOpen && <ZapModal note={note} onClose={() => setZapOpen(false)} />}
      {shareOpen && <ShareModal note={note} onClose={() => setShareOpen(false)} />}
      {likersOpen && (
        <PeopleModal
          title={`${compactNumber(engagement.likes)} Likes`}
          pubkeys={engagement.likers}
          onClose={() => setLikersOpen(false)}
        />
      )}
    </>
  );
}
