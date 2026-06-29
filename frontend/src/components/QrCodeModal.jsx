// ─────────────────────────────────────────────
// QrCodeModal — scannable QR codes for a profile's npub / lightning address
// ─────────────────────────────────────────────
// Mirrors Primal's share sheet: a "Public key" tab is always shown; a
// "Lightning address" tab only appears if the profile has set one (lud16).
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import { useProfile } from "../context/NostrContext";
import { useDisplayName } from "./ui/DisplayName";
import { toNpub, shortNpub } from "../nostr/format";

export default function QrCodeModal({ pubkey, onClose }) {
  const canvasRef = useRef(null);
  const profile = useProfile(pubkey) || {};
  const name = useDisplayName(pubkey);
  const npub = toNpub(pubkey);
  const hasLightning = Boolean(profile.lud16);
  const [tab, setTab] = useState("pubkey"); // "pubkey" | "lightning"
  const [copied, setCopied] = useState(null); // which field was just copied

  const qrValue = tab === "lightning" ? `lightning:${profile.lud16}` : npub;

  useEffect(() => {
    if (!canvasRef.current) return;
    // High error-correction so the logo punched out of the middle doesn't
    // break scannability (QR codes tolerate ~30% obscured at level "H").
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [qrValue]);

  const copy = (field, value) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar pubkey={pubkey} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-on-surface truncate">{name}</span>
                {profile.nip05 && <Icon name="verified" fill className="text-primary" size={16} />}
              </div>
              {profile.nip05 && <p className="text-on-surface-variant text-mono-label truncate">{profile.nip05}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface shrink-0">
            <Icon name="close" size={20} />
          </button>
        </div>

        {hasLightning && (
          <div className="flex border-b border-outline-variant">
            <button
              onClick={() => setTab("pubkey")}
              className="flex-1 py-3 font-bold text-label-sm relative hover:bg-surface-container-low transition-colors"
            >
              <span className={tab === "pubkey" ? "text-on-surface" : "text-on-surface-variant"}>Public key</span>
              {tab === "pubkey" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setTab("lightning")}
              className="flex-1 py-3 font-bold text-label-sm relative hover:bg-surface-container-low transition-colors"
            >
              <span className={tab === "lightning" ? "text-on-surface" : "text-on-surface-variant"}>Lightning address</span>
              {tab === "lightning" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
            </button>
          </div>
        )}

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="relative p-3 bg-white rounded-2xl">
            <canvas ref={canvasRef} />
            <div className="absolute inset-0 flex items-center justify-center">
              {tab === "lightning" ? (
                <div className="w-11 h-11 rounded-full bg-black border-2 border-white shadow flex items-center justify-center overflow-hidden">
                  <Icon name="bolt" fill size={26} className="text-yellow-400" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-white border-2 border-white shadow flex items-center justify-center overflow-hidden">
                  <img src="/knotmark.png" alt="" className="w-9 h-9 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2 text-body-md">
          <div className="flex items-center justify-between gap-3">
            <span className="text-on-surface-variant shrink-0">Public key:</span>
            <button onClick={() => copy("pubkey", npub)} className="flex items-center gap-1.5 text-on-surface hover:text-primary transition-colors min-w-0">
              <span className="font-mono-label text-mono-label truncate">{shortNpub(pubkey)}</span>
              <Icon name={copied === "pubkey" ? "check" : "content_copy"} size={14} className={copied === "pubkey" ? "text-tertiary" : "text-on-surface-variant"} />
            </button>
          </div>
          {hasLightning && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-on-surface-variant shrink-0">Lightning address:</span>
              <button onClick={() => copy("lightning", profile.lud16)} className="flex items-center gap-1.5 text-on-surface hover:text-primary transition-colors min-w-0">
                <span className="font-mono-label text-mono-label truncate">{profile.lud16}</span>
                <Icon name={copied === "lightning" ? "check" : "content_copy"} size={14} className={copied === "lightning" ? "text-tertiary" : "text-on-surface-variant"} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
