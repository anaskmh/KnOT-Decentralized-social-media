// ─────────────────────────────────────────────
// ShortComments — comment bottom-sheet for one short
// ─────────────────────────────────────────────
// Slides up over the reel. Fetches kind-1 replies that tag this video (#e)
// and lets the user post a reply (kind 1) without leaving the feed.
import { useEffect, useRef, useState } from "react";

import Icon from "../ui/Icon";
import Avatar from "../ui/Avatar";
import DisplayName from "../ui/DisplayName";
import NoteContent from "../ui/NoteContent";
import { useNostr } from "../../context/NostrContext";
import { KIND_NOTE, buildReply } from "../../nostr/events";
import { timeAgo } from "../../nostr/format";

export default function ShortComments({ short, onClose }) {
  const { relay, identity } = useNostr();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const seen = useRef(new Set());

  useEffect(() => {
    seen.current = new Set();
    setComments([]);
    const unsub = relay.subscribe(
      { kinds: [KIND_NOTE], "#e": [short.id], limit: 200 },
      (event) => {
        if (seen.current.has(event.id)) return;
        seen.current.add(event.id);
        setComments((cur) => [...cur, event].sort((a, b) => b.created_at - a.created_at));
      },
    );
    return () => unsub();
  }, [relay, short.id]);

  const post = () => {
    const body = text.trim();
    if (!body) return;
    const event = buildReply(identity.privHex, body, short);
    relay.publish(event);
    // Optimistically show our own comment right away.
    seen.current.add(event.id);
    setComments((cur) => [event, ...cur]);
    setText("");
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-surface-container-low rounded-t-2xl max-h-[70%] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
          {comments.length === 0 ? (
            <p className="p-8 text-center text-on-surface-variant opacity-50 text-body-md">
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 px-4 py-3">
                <Avatar pubkey={c.pubkey} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <DisplayName pubkey={c.pubkey} className="font-bold text-on-surface text-label-sm truncate" />
                    <span className="text-on-surface-variant text-mono-label">· {timeAgo(c.created_at)}</span>
                  </div>
                  <NoteContent text={c.content} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 p-3 border-t border-outline-variant">
          <Avatar pubkey={identity.pubHex} size={36} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") post(); }}
            placeholder="Add a comment…"
            className="flex-1 bg-surface-container rounded-full px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={post}
            disabled={!text.trim()}
            className="bg-primary text-on-primary font-bold rounded-full px-5 py-2.5 text-label-sm disabled:opacity-40 active:scale-95 transition-all"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
