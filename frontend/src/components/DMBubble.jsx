// One decrypted DM bubble (NIP-04). Decrypts lazily on mount.
import { useEffect, useState } from "react";

import { useNostr } from "../context/NostrContext";
import { decryptDM } from "../nostr/dm";
import { timeAgo } from "../nostr/format";

export default function DMBubble({ event }) {
  const { identity } = useNostr();
  const [text, setText] = useState("…");
  const mine = event.pubkey === identity.pubHex;

  useEffect(() => {
    let alive = true;
    decryptDM(identity.privHex, identity.pubHex, event).then((t) => {
      if (alive) setText(t);
    });
    return () => {
      alive = false;
    };
  }, [event, identity]);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 text-body-md ${
          mine ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <p className={`text-[10px] mt-1 ${mine ? "text-on-primary-container/70" : "text-on-surface-variant"}`}>
          {timeAgo(event.created_at)}
        </p>
      </div>
    </div>
  );
}
