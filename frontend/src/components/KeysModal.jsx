// ─────────────────────────────────────────────
// KeysModal — view & copy your Nostr keys
// ─────────────────────────────────────────────
// npub = your PUBLIC key (safe to share — it's your identity/handle).
// nsec = your PRIVATE key (secret — anyone with it controls your account).
// The nsec stays hidden behind dots until you choose to reveal it.
import { useState } from "react";

import Icon from "./ui/Icon";
import { useNostr } from "../context/NostrContext";

export default function KeysModal({ onClose }) {
  const { identity } = useNostr();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState("");

  const copy = (label, value) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
          <span className="font-bold flex items-center gap-1">
            <Icon name="key" size={18} className="text-primary" /> Your keys
          </span>
          <span className="w-6" />
        </div>

        <div className="p-gutter flex flex-col gap-4">
          {/* Public key */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-on-surface font-bold text-label-sm">Public key</span>
              <span className="text-on-surface-variant text-mono-label">· npub · safe to share</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-2">
              <span className="flex-1 font-mono-label text-mono-label break-all text-on-surface">{identity.npub}</span>
              <button
                onClick={() => copy("npub", identity.npub)}
                className="shrink-0 bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full font-bold text-label-sm hover:bg-surface-container-highest"
              >
                {copied === "npub" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Private key */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-error font-bold text-label-sm">Private key</span>
              <span className="text-on-surface-variant text-mono-label">· nsec · never share</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-2">
              <span className="flex-1 font-mono-label text-mono-label break-all text-on-surface">
                {revealed ? identity.nsec : "•".repeat(48)}
              </span>
              <button
                onClick={() => setRevealed((r) => !r)}
                className="shrink-0 text-on-surface-variant hover:text-primary"
                title={revealed ? "Hide" : "Reveal"}
              >
                <Icon name={revealed ? "visibility_off" : "visibility"} size={20} />
              </button>
              <button
                onClick={() => copy("nsec", identity.nsec)}
                className="shrink-0 bg-error-container text-on-error-container px-3 py-1.5 rounded-full font-bold text-label-sm"
              >
                {copied === "nsec" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-on-surface-variant text-mono-label mt-2 flex items-start gap-1">
              <Icon name="warning" size={14} className="text-error mt-0.5" />
              Anyone with your nsec fully controls your account. Store it somewhere safe and never paste it on sites you don't trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
