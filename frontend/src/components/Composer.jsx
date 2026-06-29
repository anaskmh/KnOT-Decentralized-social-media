// ─────────────────────────────────────────────
// Composer — collapsed pill → expanded editor (Primal style)
// ─────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import NoteContent from "./ui/NoteContent";
import { useNostr } from "../context/NostrContext";
import { buildNote, buildReply } from "../nostr/events";
import { uploadMedia } from "../nostr/upload";

const TOOLS = [
  { icon: "image",                label: "Image" },
  { icon: "format_list_bulleted", label: "List" },
  { icon: "sentiment_satisfied",  label: "Emoji" },
];

export default function Composer({ replyTo = null, onPosted, autoFocus = false }) {
  const { identity, relay } = useNostr();
  const [expanded, setExpanded] = useState(!!replyTo || autoFocus);
  const [content, setContent] = useState("");
  // The image is kept SEPARATE from the typed text — shown as its own
  // attachment chip — so typing a caption never collides with the URL.
  // It only gets stitched into the note's content at post time.
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const pickImage = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, identity.privHex);
      setImage(url);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

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
    // The image URL rides along in the content (Nostr's usual convention —
    // clients render a trailing image URL inline), but it's appended only
    // now, so the textarea itself stayed clean for typing a caption.
    const full = image ? (text ? `${text}\n${image}` : image) : text;
    if (!full) return;
    const event = replyTo
      ? buildReply(identity.privHex, full, replyTo)
      : buildNote(identity.privHex, full);
    relay.publish(event);
    setContent("");
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setExpanded(false);
    onPosted?.(event);
  };

  const cancel = () => {
    setContent("");
    setImage(null);
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

      {/* Attached image — its own chip, separate from the text you type */}
      {image && (
        <div className="mx-4 mb-3 relative inline-block">
          <img src={image} alt="" className="max-h-[200px] rounded-xl border border-outline-variant" />
          <button
            onClick={() => setImage(null)}
            title="Remove image"
            className="absolute top-1.5 right-1.5 bg-black/70 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/90"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

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
        <div className="flex gap-1 text-on-surface-variant items-center">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {TOOLS.map((t) => (
            <button
              key={t.icon}
              title={t.label}
              onClick={t.icon === "image" ? pickImage : undefined}
              disabled={t.icon === "image" && uploading}
              className="p-2 hover:bg-surface-container rounded-full transition-colors hover:text-primary disabled:opacity-40"
            >
              <Icon name={t.icon === "image" && uploading ? "progress_activity" : t.icon} size={20} className={t.icon === "image" && uploading ? "animate-spin" : ""} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={post}
            disabled={!content.trim() && !image}
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
