// ─────────────────────────────────────────────
// NotificationToast — live popup when a new notification arrives
// ─────────────────────────────────────────────
// Listens to the global notification stream and shows a brief toast
// for each new event (like, follow, repost, reply, zap).
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Avatar from "./Avatar";
import { useNostr } from "../../context/NostrContext";
import { useWallet } from "../../context/WalletContext";
import { useDisplayName } from "./DisplayName";
import { getZapperPubkey } from "../../nostr/zap";

const META = {
  1:    { emoji: "💬", label: "replied to your note" },
  3:    { emoji: "👤", label: "followed you" },
  6:    { emoji: "🔁", label: "reposted your note" },
  7:    { emoji: "❤️", label: "liked your note" },
  9735: { emoji: "⚡", label: "zapped your note" },
};

// How long each toast stays visible (ms).
const TOAST_DURATION = 3000;

export default function NotificationToast() {
  const { notifications, lastDm } = useNostr();
  const { lastWalletActivity } = useWallet();
  const [toasts, setToasts] = useState([]);
  const prevCountRef = useRef(0);
  const prevDmIdRef = useRef(null);
  const prevWalletKeyRef = useRef(null);
  // Anything timestamped before this moment is old — it's just the relay
  // replaying history on (re)connect, not a fresh event. Only events that
  // happen AFTER the app opened should ever pop a toast.
  const sessionStart = useRef(Math.floor(Date.now() / 1000));

  // When a new notification arrives (notifications array grows), push a toast.
  useEffect(() => {
    if (notifications.length <= prevCountRef.current) {
      prevCountRef.current = notifications.length;
      return;
    }
    // Show the newest one (index 0 — already sorted newest-first).
    const newest = notifications[0];
    prevCountRef.current = notifications.length;

    if (newest.created_at < sessionStart.current) return; // historical replay — skip

    const id = newest.id;
    setToasts((prev) => {
      // Don't duplicate the same event.
      if (prev.some((t) => t.id === id)) return prev;
      return [{ id, event: newest }, ...prev].slice(0, 3); // max 3 stacked
    });

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [notifications]);

  // New encrypted DM — pop the same kind of toast, but it routes to /messages.
  useEffect(() => {
    if (!lastDm || lastDm.id === prevDmIdRef.current) return;
    prevDmIdRef.current = lastDm.id;

    const id = lastDm.id;
    setToasts((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [{ id, event: lastDm, isDm: true }, ...prev].slice(0, 3);
    });

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [lastDm]);

  // New settled incoming wallet payment — pops a toast that routes to /wallet.
  // NWC has no real-time push, so this fires whenever WalletContext's poll
  // notices a freshly-settled incoming transaction.
  useEffect(() => {
    if (!lastWalletActivity) return;
    const key = lastWalletActivity.payment_hash || `${lastWalletActivity.invoice}-${lastWalletActivity.created_at}`;
    if (key === prevWalletKeyRef.current) return;
    prevWalletKeyRef.current = key;

    setToasts((prev) => {
      if (prev.some((t) => t.id === key)) return prev;
      return [{ id: key, event: lastWalletActivity, isWallet: true }, ...prev].slice(0, 3);
    });

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== key));
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [lastWalletActivity]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          event={toast.event}
          isDm={toast.isDm}
          isWallet={toast.isWallet}
          onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({ event, isDm, isWallet, onDismiss }) {
  const navigate = useNavigate();
  const fromPubkey = isWallet ? null : event.kind === 9735 ? getZapperPubkey(event) : event.pubkey;
  const name = useDisplayName(fromPubkey);
  const sats = isWallet ? Math.floor(event.amount / 1000) : 0;
  const meta = isWallet
    ? { emoji: "⚡", label: `You have a wallet activity — +${sats.toLocaleString()} sats` }
    : isDm
    ? { emoji: "✉️", label: "You have a new message" }
    : META[event.kind] || { emoji: "🔔", label: "interacted with you" };

  return (
    <div
      onClick={() => { navigate(isWallet ? "/wallet" : isDm ? "/messages" : "/notifications"); onDismiss(); }}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl cursor-pointer hover:bg-surface-container-highest transition-colors animate-in slide-in-from-right-4 fade-in duration-300 min-w-[260px] max-w-[320px]"
    >
      <span className="text-2xl leading-none">{meta.emoji}</span>
      {!isWallet && <Avatar pubkey={fromPubkey} size={32} />}
      <div className="flex-1 min-w-0">
        {!isWallet && <p className="text-label-sm font-bold text-on-surface truncate">{name}</p>}
        <p className="text-mono-label text-on-surface-variant truncate">{meta.label}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="text-on-surface-variant hover:text-on-surface transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
