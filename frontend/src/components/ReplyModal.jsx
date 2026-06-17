// Reply modal — shows the note being replied to, then a Composer in reply mode.
import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import Composer from "./Composer";
import DisplayName, { Handle } from "./ui/DisplayName";
import NoteContent from "./ui/NoteContent";
import { timeAgo } from "../nostr/format";

export default function ReplyModal({ note, onClose }) {
  if (!note) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        {/* The note we're replying to */}
        <div className="px-gutter pt-3 flex gap-3">
          <Avatar pubkey={note.pubkey} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <DisplayName pubkey={note.pubkey} className="font-bold text-on-surface truncate" />
              <Handle pubkey={note.pubkey} className="text-on-surface-variant text-body-md ml-1 truncate" />
              <span className="text-on-surface-variant text-body-md">· {timeAgo(note.created_at)}</span>
            </div>
            <NoteContent text={note.content} />
          </div>
        </div>

        <Composer replyTo={note} autoFocus onPosted={onClose} />
      </div>
    </div>
  );
}
