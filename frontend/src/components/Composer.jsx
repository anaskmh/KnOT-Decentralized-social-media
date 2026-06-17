// ─────────────────────────────────────────────
// Composer — collapsed pill → expanded editor (Primal style)
// ─────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import NoteContent from "./ui/NoteContent";
import { useNostr } from "../context/NostrContext";
import { buildNote, buildReply } from "../nostr/events";

const TOOLS = [
  { icon: "image",                label: "Image" },
  { icon: "format_list_bulleted", label: "List" },
  { icon: "sentiment_satisfied",  label: "Emoji" },
];

export default function Composer({ replyTo = null, onPosted, autoFocus = false }) {
  const { identity, relay } = useNostr();
  const [expanded, setExpanded] = useState(!!replyTo || autoFocus);
  const [content, setContent] = useState("");
  const textareaRef = useRef(null);

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  const grow = (e) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const post = () => {
    const text = content.trim();
    if (!text) return;
    const event = replyTo
      ? buildReply(identity.privHex, text, replyTo)
      : buildNote(identity.privHex, text);
    relay.publish(event);
    setContent("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setExpanded(false);
    onPosted?.(event);
  };

  const cancel = () => {
    setContent("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setExpanded(false);
  };

  // ── Collapsed pill ────────────────────────────────────────────
  if (!expanded) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant cursor-pointer hover:bg-surface-container-low transition-colors"
        onClick={() => setExpanded(true)}
      >
        <Avatar pubkey={identity.pubHex} size={40} />
        <span className="flex-1 bg-surface-container rounded-full px-4 py-2.5 text-on-surface-variant text-body-md select-none">
          Say something on nostr…
        </span>
      </div>
    );
  }

  // ── Expanded editor ───────────────────────────────────────────
  return (
    <section className="border-b border-outline-variant border-2 border-primary/60 rounded-xl mx-3 my-2 overflow-hidden bg-surface-container-low">
      <div className="flex gap-3 p-4">
        <Avatar pubkey={identity.pubHex} size={44} />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={grow}
          rows={3}
          placeholder={replyTo ? "Post your reply…" : ""}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none font-body-lg text-body-lg placeholder:text-on-surface-variant resize-none min-h-[60px]"
        />
      </div>

      {/* Note preview */}
      {content.trim() && (
        <div className="mx-4 mb-3">
          <p className="text-[10px] font-bold text-on-surface-variant tracking-widest mb-1">NOTE PREVIEW</p>
          <div className="bg-surface-container rounded-xl px-3 py-2 min-h-[60px] text-body-md text-on-surface">
            <NoteContent text={content} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/30">
        <div className="flex gap-1 text-on-surface-variant">
          {TOOLS.map((t) => (
            <button
              key={t.icon}
              title={t.label}
              className="p-2 hover:bg-surface-container rounded-full transition-colors hover:text-primary"
            >
              <Icon name={t.icon} size={20} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={post}
            disabled={!content.trim()}
            className="bg-primary px-6 py-2 rounded-full text-on-primary font-bold text-label-sm active:scale-95 transition-all disabled:opacity-40"
          >
            {replyTo ? "Reply" : "Post"}
          </button>
          <button
            onClick={cancel}
            className="bg-surface-container px-5 py-2 rounded-full text-on-surface-variant font-bold text-label-sm hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
