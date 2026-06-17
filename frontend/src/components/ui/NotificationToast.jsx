// ─────────────────────────────────────────────
// NotificationToast — live popup when a new notification arrives
// ─────────────────────────────────────────────
// Listens to the global notification stream and shows a brief toast
// for each new event (like, follow, repost, reply, zap).
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Avatar from "./Avatar";
import { useNostr } from "../../context/NostrContext";
import { useDisplayName } from "./DisplayName";

const META = {
  1:    { emoji: "💬", label: "replied to your note" },
  3:    { emoji: "👤", label: "followed you" },
  6:    { emoji: "🔁", label: "reposted your note" },
  7:    { emoji: "❤️", label: "liked your note" },
  9735: { emoji: "⚡", label: "zapped your note" },
};

// How long each toast stays visible (ms).
const TOAST_DURATION = 4000;

export default function NotificationToast() {
  const { notifications } = useNostr();
  const [toasts, setToasts] = useState([]);
  const prevCountRef = useRef(0);

  // When a new notification arrives (notifications array grows), push a toast.
  useEffect(() => {
    if (notifications.length <= prevCountRef.current) {
      prevCountRef.current = notifications.length;
      return;
    }
    // Show the newest one (index 0 — already sorted newest-first).
    const newest = notifications[0];
    prevCountRef.current = notifications.length;

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

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          event={toast.event}
          onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({ event, onDismiss }) {
  const navigate = useNavigate();
  const name = useDisplayName(event.pubkey);
  const meta = META[event.kind] || { emoji: "🔔", label: "interacted with you" };

  return (
    <div
      onClick={() => { navigate("/notifications"); onDismiss(); }}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl cursor-pointer hover:bg-surface-container-highest transition-colors animate-in slide-in-from-right-4 fade-in duration-300 min-w-[260px] max-w-[320px]"
    >
      <span className="text-2xl leading-none">{meta.emoji}</span>
      <Avatar pubkey={event.pubkey} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-label-sm font-bold text-on-surface truncate">{name}</p>
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
