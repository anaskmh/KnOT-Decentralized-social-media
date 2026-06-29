// ─────────────────────────────────────────────
// ShareModal — share a note or short through in-app DMs
// ─────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { neventEncode } from "nostr-tools/nip19";

import Avatar from "./ui/Avatar";
import DisplayName, { useDisplayName } from "./ui/DisplayName";
import Icon from "./ui/Icon";
import { useNostr } from "../context/NostrContext";
import { buildDM, KIND_DM } from "../nostr/events";
import { buildDMShareContent, describeDMContent, decryptDM, dmPartner } from "../nostr/dm";
import { getShortCaption, getShortMediaDetails, getShortVideoUrl } from "../nostr/video";
import { shortNpub, timeAgo } from "../nostr/format";

function buildSharePayload(note) {
  const base = {
    kind: note.kind,
    id: note.id,
    pubkey: note.pubkey,
    created_at: note.created_at,
    noteLink: `nostr:${neventEncode({ id: note.id, author: note.pubkey, kind: note.kind })}`,
    title: note.kind === 22 ? "Short" : "Post",
    caption: String(note.content || "").trim(),
  };

  if (note.kind === 22) {
    const media = getShortMediaDetails(note);
    const mediaUrl = getShortVideoUrl(note) || "";
    const caption = getShortCaption(note);
    return {
      ...base,
      title: caption ? "Short" : "Short",
      caption,
      mediaType: "video",
      mediaUrl,
      posterUrl: media?.posterUrl || "",
    };
  }

  return base;
}

export default function ShareModal({ note, onClose }) {
  const navigate = useNavigate();
  const { identity, relay, mutes } = useNostr();
  const [all, setAll] = useState([]);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState([]);
  const [sentToast, setSentToast] = useState(null);

  const sharePayload = useMemo(() => buildSharePayload(note), [note]);
  const shareText = useMemo(() => buildDMShareContent(sharePayload), [sharePayload]);

  useEffect(() => {
    if (!identity) return undefined;

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
    return () => {
      unsubReceived();
      unsubSent();
      setAll([]);
    };
  }, [identity, relay]);

  const conversations = useMemo(() => {
    if (!identity) return [];
    const byPartner = new Map();
    for (const event of all) {
      const partner = dmPartner(identity.pubHex, event);
      if (!partner || mutes.includes(partner)) continue;
      if (!byPartner.has(partner)) byPartner.set(partner, []);
      byPartner.get(partner).push(event);
    }
    return [...byPartner.entries()]
      .map(([partner, msgs]) => ({ partner, msgs, last: msgs[msgs.length - 1] }))
      .sort((a, b) => b.last.created_at - a.last.created_at);
  }, [all, identity, mutes]);

  const togglePartner = (partner) => {
    setSelected((prev) => (prev.includes(partner) ? prev.filter((p) => p !== partner) : [...prev, partner]));
  };

  const sendToSelected = async () => {
    if (!identity || sending || selected.length === 0) return;
    setSending(true);
    try {
      for (const partner of selected) {
        const event = await buildDM(identity.privHex, partner, shareText);
        relay.publish(event);
      }
      setSentToast(selected.length);
      setSelected([]);
      setTimeout(() => {
        setSentToast(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Failed to share in DM:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <span className="font-bold text-on-surface">Share in DM</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface" type="button">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-outline-variant">
          <SharePreview note={note} payload={sharePayload} />
        </div>

        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.22em] text-on-surface-variant uppercase">Recent chats</span>
          <button
            onClick={() => {
              onClose();
              navigate("/messages");
            }}
            className="text-label-sm font-bold text-primary hover:opacity-80"
            type="button"
          >
            Open Messages
          </button>
        </div>

        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-4 py-6 text-center text-on-surface-variant text-body-md">
              No DM conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationPickRow
                key={c.partner}
                convo={c}
                disabled={sending}
                checked={selected.includes(c.partner)}
                onToggle={() => togglePartner(c.partner)}
              />
            ))
          )}
        </div>

        {selected.length > 0 && (
          <div className="shrink-0 border-t border-outline-variant p-3 flex items-center justify-between gap-3">
            <span className="text-label-sm text-on-surface-variant">
              {selected.length} selected
            </span>
            <button
              onClick={sendToSelected}
              disabled={sending}
              type="button"
              className="text-label-sm font-bold text-on-primary bg-primary rounded-full px-5 py-2 hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        )}
      </div>

      {sentToast != null && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-label-sm font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-[70]">
          <Icon name="check_circle" fill size={18} className="text-primary" />
          {sentToast === 1 ? "Shared to 1 person" : `Shared to ${sentToast} people`}
        </div>
      )}
    </div>
  );
}

function SharePreview({ note, payload }) {
  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden bg-surface-container-high">
      {payload.mediaType === "video" && payload.mediaUrl ? (
        <div className="relative bg-black">
          <video
            src={payload.mediaUrl}
            poster={payload.posterUrl || undefined}
            muted
            playsInline
            preload="metadata"
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
          <div className="absolute left-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold tracking-[0.22em] uppercase text-white">
            Video preview
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 flex items-start gap-3">
          <Avatar pubkey={note.pubkey} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <DisplayName pubkey={note.pubkey} className="font-bold text-on-surface truncate" />
              <span className="text-[10px] text-on-surface-variant">{timeAgo(note.created_at)}</span>
            </div>
            <p className="mt-1 text-body-md text-on-surface-variant line-clamp-3 whitespace-pre-wrap break-words">
              {payload.caption || note.content}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-sm font-bold text-on-surface truncate">{payload.title}</p>
          <p className="text-[10px] text-on-surface-variant truncate">{shortNpub(note.pubkey)}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-on-surface-variant shrink-0">
          DM only
        </span>
      </div>
    </div>
  );
}

function ConversationPickRow({ convo, onToggle, disabled, checked }) {
  const { identity } = useNostr();
  const name = useDisplayName(convo.partner);
  const mine = convo.last.pubkey === identity?.pubHex;
  const [preview, setPreview] = useState("…");

  useEffect(() => {
    if (!identity) return undefined;
    let alive = true;
    decryptDM(identity.privHex, identity.pubHex, convo.last).then((text) => {
      if (alive) setPreview(describeDMContent(text));
    });
    return () => {
      alive = false;
    };
  }, [convo.last, identity]);

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      type="button"
      className={`w-full flex items-center gap-3 p-gutter border-b border-outline-variant transition-colors text-left disabled:opacity-60 ${
        checked ? "bg-primary-container/30" : "hover:bg-surface-container-low"
      }`}
    >
      <span className="relative shrink-0">
        <Avatar pubkey={convo.partner} size={44} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-on-surface font-bold">{name}</span>
          <span className="text-mono-label text-on-surface-variant shrink-0">{timeAgo(convo.last.created_at)}</span>
        </div>
        <p className="truncate flex items-center gap-1 text-on-surface-variant">
          {mine && <span className="shrink-0">You:</span>} {preview}
        </p>
      </div>
      <span
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          checked ? "bg-primary border-primary" : "border-outline-variant"
        }`}
      >
        {checked && <Icon name="check" size={14} className="text-on-primary" />}
      </span>
    </button>
  );
}
