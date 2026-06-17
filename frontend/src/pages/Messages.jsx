// ─────────────────────────────────────────────
// Messages — encrypted direct messages (NIP-04)
// ─────────────────────────────────────────────
// Lists conversations (grouped by partner) and a chat thread. Outgoing
// messages are encrypted to the recipient; incoming ones are decrypted
// locally in DMBubble.
import { useMemo, useState } from "react";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import DMBubble from "../components/DMBubble";
import DisplayName, { useDisplayName } from "../components/ui/DisplayName";
import { useNostr } from "../context/NostrContext";
import { useFeed } from "../hooks/useFeed";
import { buildDM, KIND_DM } from "../nostr/events";
import { dmPartner } from "../nostr/dm";
import { shortNpub, timeAgo } from "../nostr/format";
import { decode } from "nostr-tools/nip19";

export default function Messages() {
  const { identity } = useNostr();

  // All DMs to me + from me.
  const received = useFeed({ kinds: [KIND_DM], "#p": [identity.pubHex], limit: 200 });
  const sent = useFeed({ kinds: [KIND_DM], authors: [identity.pubHex], limit: 200 });

  const all = useMemo(() => {
    const map = new Map();
    [...received.notes, ...sent.notes].forEach((e) => map.set(e.id, e));
    return [...map.values()].sort((a, b) => a.created_at - b.created_at);
  }, [received.notes, sent.notes]);

  // Group by conversation partner.
  const conversations = useMemo(() => {
    const byPartner = new Map();
    for (const e of all) {
      const partner = dmPartner(identity.pubHex, e);
      if (!partner) continue;
      if (!byPartner.has(partner)) byPartner.set(partner, []);
      byPartner.get(partner).push(e);
    }
    return [...byPartner.entries()]
      .map(([partner, msgs]) => ({ partner, msgs, last: msgs[msgs.length - 1] }))
      .sort((a, b) => b.last.created_at - a.last.created_at);
  }, [all, identity.pubHex]);

  const [active, setActive] = useState(null);
  const activeConvo = conversations.find((c) => c.partner === active);

  // ── Thread view ───────────────────────────────────────────────
  if (active) {
    return (
      <ThreadView
        partner={active}
        messages={activeConvo?.msgs || []}
        onBack={() => setActive(null)}
      />
    );
  }

  // ── Conversation list ─────────────────────────────────────────
  return (
    <>
      <Header
        title="Messages"
        right={<Icon name="edit_square" className="text-on-surface-variant cursor-pointer hover:text-primary" />}
      />
      <NewConversation onStart={setActive} />

      {conversations.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="lock" size={40} />
          <p className="text-body-md text-center">No conversations yet.<br />Messages are end-to-end encrypted (NIP-04).</p>
        </div>
      ) : (
        conversations.map((c) => <ConversationRow key={c.partner} convo={c} onClick={() => setActive(c.partner)} />)
      )}
    </>
  );
}

function ConversationRow({ convo, onClick }) {
  const name = useDisplayName(convo.partner);
  return (
    <button onClick={onClick} className="w-full flex gap-3 p-gutter border-b border-outline-variant hover:bg-surface-container-low transition-colors text-left">
      <Avatar pubkey={convo.partner} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-on-surface truncate">{name}</span>
          <span className="text-on-surface-variant text-mono-label">{timeAgo(convo.last.created_at)}</span>
        </div>
        <p className="text-on-surface-variant text-body-md truncate flex items-center gap-1">
          <Icon name="lock" size={14} /> Encrypted message
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

function ThreadView({ partner, messages, onBack }) {
  const { identity, relay } = useNostr();
  const name = useDisplayName(partner);
  const [text, setText] = useState("");

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const event = await buildDM(identity.privHex, partner, body);
    relay.publish(event);
    setText("");
  };

  return (
    <div className="flex flex-col h-screen sticky top-0">
      <Header
        title={name}
        subtitle={shortNpub(partner)}
        onBack={onBack}
        right={<Icon name="bolt" fill className="text-zap-yellow" />}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter flex flex-col gap-3">
        <div className="flex items-center gap-2 self-center text-on-surface-variant text-mono-label bg-surface-container-low border border-outline-variant rounded-full px-3 py-1">
          <Icon name="lock" size={14} /> Messages are end-to-end encrypted
        </div>
        {messages.map((e) => (
          <DMBubble key={e.id} event={e} />
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-outline-variant p-gutter flex gap-2 items-center"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
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
