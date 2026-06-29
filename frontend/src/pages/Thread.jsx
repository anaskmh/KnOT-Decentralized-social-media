// ─────────────────────────────────────────────
// Thread — single post + who liked / reposted / replied
// ─────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import NoteCard from "../components/NoteCard";
import DisplayName from "../components/ui/DisplayName";
import { useFeed } from "../hooks/useFeed";
import { useNostr } from "../context/NostrContext";
import { KIND_NOTE, KIND_REPOST, KIND_REACTION } from "../nostr/events";
import { compactNumber, timeAgo } from "../nostr/format";
import { getZapperPubkey } from "../nostr/zap";

const KIND_ZAP_RECEIPT = 9735;

// Find the note this one is directly replying to (NIP-10): prefer the
// "reply"-marked e tag, fall back to the last e tag (legacy convention).
function getParentId(note) {
  const eTags = note?.tags?.filter((t) => t[0] === "e") || [];
  if (!eTags.length) return null;
  const reply = eTags.find((t) => t[3] === "reply");
  if (reply) return reply[1];
  return eTags[eTags.length - 1][1];
}

function PeopleRow({ pubkeys, label, emoji, onSeeAll }) {
  const navigate = useNavigate();
  if (!pubkeys.length) return null;
  const preview = pubkeys.slice(0, 8);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
      <span className="text-lg w-6 text-center shrink-0">{emoji}</span>
      <div className="flex -space-x-2">
        {preview.map((pk) => (
          <button
            key={pk}
            onClick={() => navigate(`/profile/${pk}`)}
            className="rounded-full border-2 border-surface-container-low hover:scale-110 transition-transform"
          >
            <Avatar pubkey={pk} size={28} />
          </button>
        ))}
      </div>
      <span className="text-body-md text-on-surface-variant flex-1">
        <b className="text-on-surface">{compactNumber(pubkeys.length)}</b> {label}
      </span>
      {pubkeys.length > 8 && (
        <button onClick={onSeeAll} className="text-primary text-label-sm font-bold hover:opacity-80">
          See all
        </button>
      )}
    </div>
  );
}

function SeeAllModal({ title, pubkeys, onClose }) {
  const navigate = useNavigate();
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <span className="font-bold text-on-surface">{title}</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto">
          {pubkeys.map((pk) => (
            <button
              key={pk}
              onClick={() => { onClose(); navigate(`/profile/${pk}`); }}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-surface-container transition-colors text-left"
            >
              <Avatar pubkey={pk} size={40} />
              <DisplayName pubkey={pk} className="font-bold text-on-surface" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Thread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { relay } = useNostr();

  const { notes: rootNotes, loading: rootLoading } = useFeed(
    { kinds: [KIND_NOTE], ids: [id], limit: 1 },
    { enabled: !!id },
  );

  const { notes: replies, loading: repliesLoading } = useFeed(
    { kinds: [KIND_NOTE], "#e": [id], limit: 100 },
    { enabled: !!id },
  );

  // Fetch reactions, reposts, zaps for this note
  const [engEvents, setEngEvents] = useState([]);
  useEffect(() => {
    if (!id) return;
    const seen = new Set();
    const unsub = relay.subscribe(
      { kinds: [KIND_REPOST, KIND_REACTION, KIND_ZAP_RECEIPT], "#e": [id] },
      (event) => {
        if (seen.has(event.id)) return;
        seen.add(event.id);
        setEngEvents((cur) => [...cur, event]);
      },
    );
    return () => { unsub(); setEngEvents([]); };
  }, [relay, id]);

  const likers   = useMemo(() => [...new Set(engEvents.filter(e => e.kind === KIND_REACTION).map(e => e.pubkey))], [engEvents]);
  const reposters = useMemo(() => [...new Set(engEvents.filter(e => e.kind === KIND_REPOST).map(e => e.pubkey))], [engEvents]);
  const zappers  = useMemo(() => [...new Set(engEvents.filter(e => e.kind === KIND_ZAP_RECEIPT).map(getZapperPubkey))], [engEvents]);

  const [modal, setModal] = useState(null); // { title, pubkeys }

  const root = rootNotes[0] ?? null;
  const loading = rootLoading || repliesLoading;

  // Walk up the reply chain so a notification for a nested comment opens
  // showing the whole conversation above it, not just that one reply.
  const [ancestors, setAncestors] = useState([]); // oldest first
  useEffect(() => {
    if (!root) { setAncestors([]); return; }
    let cancelled = false;

    const fetchOne = (eventId) =>
      new Promise((resolve) => {
        let found = null;
        const unsub = relay.subscribe(
          { kinds: [KIND_NOTE], ids: [eventId], limit: 1 },
          (ev) => { found = ev; },
          () => { unsub(); resolve(found); },
        );
        setTimeout(() => { unsub(); resolve(found); }, 3000);
      });

    (async () => {
      const chain = [];
      let current = root;
      for (let i = 0; i < 20; i++) {
        const parentId = getParentId(current);
        if (!parentId) break;
        const parent = await fetchOne(parentId);
        if (!parent || cancelled) break;
        chain.unshift(parent);
        setAncestors([...chain]);
        current = parent;
      }
    })();

    return () => { cancelled = true; };
  }, [relay, root?.id]);

  return (
    <>
      <Header title="Post" onBack={() => navigate(-1)} />

      {rootLoading && !root ? (
        <div className="p-10 flex justify-center text-on-surface-variant opacity-40">
          <Icon name="progress_activity" className="animate-spin" size={32} />
        </div>
      ) : root ? (
        <>
          {/* Ancestor chain — what this note is replying to, oldest first */}
          {ancestors.map((a) => (
            <NoteCard key={a.id} note={a} threadLine />
          ))}
          <NoteCard note={root} threadLine={replies.length > 0} />
        </>
      ) : (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="error" size={40} />
          <p className="text-body-md">Note not found.</p>
        </div>
      )}

      {/* Engagement rows — who liked / reposted / zapped */}
      {root && (
        <>
          <PeopleRow
            pubkeys={likers}
            label={`liked this`}
            emoji="❤️"
            onSeeAll={() => setModal({ title: `${likers.length} Likes`, pubkeys: likers })}
          />
          <PeopleRow
            pubkeys={reposters}
            label={`reposted this`}
            emoji="🔁"
            onSeeAll={() => setModal({ title: `${reposters.length} Reposts`, pubkeys: reposters })}
          />
          <PeopleRow
            pubkeys={zappers}
            label={`zapped this`}
            emoji="⚡"
            onSeeAll={() => setModal({ title: `${zappers.length} Zaps`, pubkeys: zappers })}
          />
        </>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <>
          <div className="px-4 py-2 border-b border-outline-variant text-on-surface-variant text-mono-label flex items-center gap-2">
            <Icon name="chat_bubble" size={15} />
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </div>
          {replies.map((reply) => (
            <NoteCard key={reply.id} note={reply} indent />
          ))}
        </>
      )}

      {!loading && root && replies.length === 0 && likers.length === 0 && reposters.length === 0 && (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="chat_bubble" size={36} />
          <p className="text-body-md">No replies yet. Be the first!</p>
        </div>
      )}

      {modal && (
        <SeeAllModal
          title={modal.title}
          pubkeys={modal.pubkeys}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
