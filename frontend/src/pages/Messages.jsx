// ─────────────────────────────────────────────
// Messages — encrypted direct messages (NIP-04)
// ─────────────────────────────────────────────
// Lists conversations (grouped by partner) and a chat thread. Outgoing
// messages are encrypted to the recipient; incoming ones are decrypted
// locally in DMBubble.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import DMBubble from "../components/DMBubble";
import DisplayName, { useDisplayName } from "../components/ui/DisplayName";
import { useNostr } from "../context/NostrContext";
import { buildDM, buildTyping, KIND_DM, KIND_TYPING } from "../nostr/events";
import { dmPartner, decryptDM, describeDMContent } from "../nostr/dm";
import { shortNpub, timeAgo } from "../nostr/format";
import { decode } from "nostr-tools/nip19";

// Per-partner "last read" timestamps, so the conversation list can keep
// highlighting a chat until THAT specific chat is opened (not just the
// global Messages badge, which clears as soon as the list page is seen).
const READ_MAP_KEY = "knot_dm_read_map";
function loadReadMap() {
  try { return JSON.parse(localStorage.getItem(READ_MAP_KEY) || "{}"); } catch { return {}; }
}

// Messages are end-to-end encrypted and already delivered to the other
// party by the time we see them, so "delete" can only ever mean "remove
// from my own view" — there's no way to unsend a DM the recipient already
// has. Persisted locally so it stays hidden across reloads.
const DELETED_DM_KEY = "knot_deleted_dms";
function loadDeletedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_DM_KEY) || "[]")); } catch { return new Set(); }
}
function saveDeletedIds(set) {
  try { localStorage.setItem(DELETED_DM_KEY, JSON.stringify([...set])); } catch { /* quota — ignore */ }
}

// Double-tap-to-like a message, same gesture as liking a Short. There's no
// NIP for reacting to an encrypted DM, so this is a local-only heart on top
// of the message — it doesn't notify or sync to the other party.
const LIKED_DM_KEY = "knot_liked_dms";
function loadLikedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_DM_KEY) || "[]")); } catch { return new Set(); }
}
function saveLikedIds(set) {
  try { localStorage.setItem(LIKED_DM_KEY, JSON.stringify([...set])); } catch { /* quota — ignore */ }
}

export default function Messages() {
  const { identity, relay, markMessagesRead, mutes } = useNostr();

  // Mark all DMs as read when the user opens this page.
  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  // All DMs to me + from me. Kept as a PERMANENT subscription (unlike the
  // one-shot useFeed) so a message that arrives while a chat is already
  // open shows up immediately instead of waiting for the next remount.
  const [all, setAll] = useState([]);
  // Push a just-sent event in immediately, before the relay round-trip
  // echoes it back — removes the "did it send?" delay on the sender's side.
  const addLocal = (event) => {
    setAll((current) => (current.some((e) => e.id === event.id) ? current : [...current, event].sort((a, b) => a.created_at - b.created_at)));
  };
  useEffect(() => {
    if (!identity) return;
    const seen = new Set();
    const byId = new Map();
    const onEvent = (event) => {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      byId.set(event.id, event);
      setAll([...byId.values()].sort((a, b) => a.created_at - b.created_at));
    };
    const unsubReceived = relay.subscribe({ kinds: [KIND_DM], "#p": [identity.pubHex], limit: 200 }, onEvent);
    const unsubSent = relay.subscribe({ kinds: [KIND_DM], authors: [identity.pubHex], limit: 200 }, onEvent);
    return () => { unsubReceived(); unsubSent(); setAll([]); };
  }, [relay, identity]);

  const [deletedIds, setDeletedIds] = useState(loadDeletedIds);
  const deleteMessage = (id) => {
    setDeletedIds((current) => {
      const next = new Set(current);
      next.add(id);
      saveDeletedIds(next);
      return next;
    });
  };

  const [likedIds, setLikedIds] = useState(loadLikedIds);
  const toggleLikeMessage = (id) => {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveLikedIds(next);
      return next;
    });
  };

  // Group by conversation partner. Blocked partners are dropped entirely —
  // no conversation row, no messages, nothing.
  const conversations = useMemo(() => {
    const byPartner = new Map();
    for (const e of all) {
      if (deletedIds.has(e.id)) continue;
      const partner = dmPartner(identity.pubHex, e);
      if (!partner || mutes.includes(partner)) continue;
      if (!byPartner.has(partner)) byPartner.set(partner, []);
      byPartner.get(partner).push(e);
    }
    return [...byPartner.entries()]
      .map(([partner, msgs]) => ({ partner, msgs, last: msgs[msgs.length - 1] }))
      .sort((a, b) => b.last.created_at - a.last.created_at);
  }, [all, identity.pubHex, mutes, deletedIds]);

  const [active, setActive] = useState(null);
  const activeConvo = conversations.find((c) => c.partner === active);

  // If the person I'm chatting with gets blocked mid-conversation, kick
  // straight back to the list — don't leave a dead chat box open.
  useEffect(() => {
    if (active && mutes.includes(active)) setActive(null);
  }, [active, mutes]);

  const [readMap, setReadMap] = useState(loadReadMap);
  const openConvo = (partner) => {
    setActive(partner);
    setReadMap((current) => {
      const next = { ...current, [partner]: Math.floor(Date.now() / 1000) };
      localStorage.setItem(READ_MAP_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Arriving here from a profile's "Message" button — auto-open that chat.
  const location = useLocation();
  useEffect(() => {
    const openPubkey = location.state?.openPubkey;
    if (openPubkey) openConvo(openPubkey);
  }, [location.state]);

  // ── Thread view ───────────────────────────────────────────────
  if (active) {
    return (
      <ThreadView
        partner={active}
        messages={activeConvo?.msgs || []}
        onBack={() => setActive(null)}
        addLocal={addLocal}
        onDeleteMessage={deleteMessage}
        likedIds={likedIds}
        onToggleLike={toggleLikeMessage}
      />
    );
  }

  // ── Conversation list ─────────────────────────────────────────
  return (
    <>
      <Header title="Messages" />
      <NewConversation onStart={setActive} />

      {conversations.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="lock" size={40} />
          <p className="text-body-md text-center">No conversations yet.<br />Messages are end-to-end encrypted (NIP-04).</p>
        </div>
      ) : (
        conversations.map((c) => {
          // Unread = the newest message in this chat came from the partner
          // (not me) and arrived after the last time I opened this chat.
          const unread = c.last.pubkey !== identity.pubHex && c.last.created_at > (readMap[c.partner] || 0);
          return <ConversationRow key={c.partner} convo={c} unread={unread} onClick={() => openConvo(c.partner)} />;
        })
      )}
    </>
  );
}

function ConversationRow({ convo, unread, onClick }) {
  const { identity } = useNostr();
  const name = useDisplayName(convo.partner);
  const mine = convo.last.pubkey === identity.pubHex;
  const [preview, setPreview] = useState("…");

  // Decrypt just the last message of the conversation, for the list preview.
  useEffect(() => {
    let alive = true;
    decryptDM(identity.privHex, identity.pubHex, convo.last).then((t) => {
      if (alive) setPreview(describeDMContent(t));
    });
    return () => { alive = false; };
  }, [convo.last, identity]);

  return (
    <button
      onClick={onClick}
      className={`w-full flex gap-3 p-gutter border-b border-outline-variant hover:bg-surface-container-low transition-colors text-left ${
        unread ? "bg-primary-container/15" : ""
      }`}
    >
      <span className="relative shrink-0">
        <Avatar pubkey={convo.partner} size={44} />
        {unread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`truncate text-on-surface ${unread ? "font-extrabold" : "font-bold"}`}>{name}</span>
          <span className={`text-mono-label ${unread ? "text-primary font-bold" : "text-on-surface-variant"}`}>
            {timeAgo(convo.last.created_at)}
          </span>
        </div>
        <p className={`truncate flex items-center gap-1 ${unread ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
          {mine && <span className="shrink-0">You:</span>} {preview}
        </p>
      </div>
    </button>
  );
}

function NewConversation({ onStart }) {
  const [value, setValue] = useState("");
  const start = (e) => {
    e.preventDefault();
    const v = value.trim();
    let pub = v;
    if (v.startsWith("npub1")) {
      try {
        pub = decode(v).data;
      } catch {
        return;
      }
    }
    if (/^[0-9a-f]{64}$/i.test(pub)) {
      onStart(pub);
      setValue("");
    }
  };
  return (
    <form onSubmit={start} className="p-gutter border-b border-outline-variant flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Start a chat — paste an npub…"
        className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 text-body-md focus:outline-none focus:border-primary"
      />
      <button className="bg-primary text-on-primary px-4 rounded-full font-bold text-label-sm">Open</button>
    </form>
  );
}

function ThreadView({ partner, messages, onBack, addLocal, onDeleteMessage, likedIds, onToggleLike }) {
  const { identity, relay } = useNostr();
  const name = useDisplayName(partner);
  const [text, setText] = useState("");

  // ── "Partner is typing…" indicator ────────────────────────────
  const [partnerTyping, setPartnerTyping] = useState(false);
  useEffect(() => {
    const clearTimer = { id: null };
    const unsub = relay.subscribe(
      { kinds: [KIND_TYPING], authors: [partner], "#p": [identity.pubHex] },
      () => {
        setPartnerTyping(true);
        clearTimeout(clearTimer.id);
        // No "stopped typing" event exists, so just expire the indicator
        // a few seconds after the last ping.
        clearTimer.id = setTimeout(() => setPartnerTyping(false), 4000);
      },
    );
    return () => { unsub(); clearTimeout(clearTimer.id); setPartnerTyping(false); };
  }, [relay, identity, partner]);

  // Ping the partner at most once every 2s while I'm actively typing.
  const lastTypingSent = useRef(0);
  const handleTextChange = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      relay.publish(buildTyping(identity.privHex, partner));
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      const event = await buildDM(identity.privHex, partner, body);
      addLocal(event);          // show it instantly — don't wait for the relay echo
      relay.publish(event);
      setText("");
    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen sticky top-0">
      <Header
        title={
          <button onClick={() => navigate(`/profile/${partner}`)} className="hover:underline text-left">
            {name}
          </button>
        }
        subtitle={shortNpub(partner)}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter flex flex-col gap-3">
        <div className="flex items-center gap-2 self-center text-on-surface-variant text-mono-label bg-surface-container-low border border-outline-variant rounded-full px-3 py-1">
          <Icon name="lock" size={14} /> Messages are end-to-end encrypted
        </div>
        {messages.map((e) => (
          <DMBubble
            key={e.id}
            event={e}
            onDelete={onDeleteMessage}
            liked={likedIds.has(e.id)}
            onToggleLike={() => onToggleLike(e.id)}
          />
        ))}
        {partnerTyping && (
          <div className="flex items-center gap-2 self-start">
            <Avatar pubkey={partner} size={28} />
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant opacity-60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant opacity-60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-outline-variant p-gutter flex gap-2 items-center"
      >
        <input
          value={text}
          onChange={handleTextChange}
          placeholder="Start a new message"
          className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2.5 text-body-md focus:outline-none focus:border-primary"
        />
        <button className="bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}
