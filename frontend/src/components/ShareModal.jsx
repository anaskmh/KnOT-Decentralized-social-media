// ─────────────────────────────────────────────
// ShareModal — share a note to social platforms
// ─────────────────────────────────────────────
import { useState } from "react";
import { noteEncode } from "nostr-tools/nip19";
import Icon from "./ui/Icon";

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TwitterLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const PLATFORMS = [
  {
    name: "Facebook",
    bg: "#1877F2",
    Logo: FacebookLogo,
    getUrl: (link) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    name: "Instagram",
    bg: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    Logo: InstagramLogo,
    getUrl: null,
  },
  {
    name: "WhatsApp",
    bg: "#25D366",
    Logo: WhatsAppLogo,
    getUrl: (link) =>
      `https://wa.me/?text=${encodeURIComponent("Check this out on Nostr: " + link)}`,
  },
  {
    name: "X (Twitter)",
    bg: "#000000",
    Logo: TwitterLogo,
    getUrl: (link) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check this out on Nostr: " + link)}`,
  },
  {
    name: "LinkedIn",
    bg: "#0A66C2",
    Logo: LinkedInLogo,
    getUrl: (link) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
];

export default function ShareModal({ note, onClose }) {
  const [copiedNostr, setCopiedNostr] = useState(false);
  const [copiedId, setCopiedId]       = useState(false);
  const [copiedInsta, setCopiedInsta] = useState(false);

  const nostrLink = `nostr:${noteEncode(note.id)}`;
  const eventId   = note.id;

  const copy = async (text, setCopied) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openShare = (url) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="font-bold text-on-surface">Share</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Social platforms */}
        <div className="grid grid-cols-5 gap-2 p-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                if (p.getUrl) {
                  openShare(p.getUrl(nostrLink));
                } else {
                  copy(nostrLink, setCopiedInsta);
                }
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
                style={{ background: p.bg }}
              >
                {p.name === "Instagram" && copiedInsta ? (
                  <span className="text-white text-lg">✅</span>
                ) : (
                  <p.Logo />
                )}
              </span>
              <span className="text-[10px] text-on-surface-variant leading-tight text-center">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          {/* Nostr link */}
          <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5">
            <span className="text-on-surface-variant text-mono-label truncate flex-1">{nostrLink}</span>
            <button
              onClick={() => copy(nostrLink, setCopiedNostr)}
              className="shrink-0 text-primary hover:opacity-80 flex items-center gap-1 text-label-sm font-bold"
            >
              <Icon name={copiedNostr ? "check" : "content_copy"} size={16} />
              {copiedNostr ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Event ID */}
          <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5">
            <span className="text-on-surface-variant text-mono-label truncate flex-1 font-mono text-xs">{eventId}</span>
            <button
              onClick={() => copy(eventId, setCopiedId)}
              className="shrink-0 text-primary hover:opacity-80 flex items-center gap-1 text-label-sm font-bold"
            >
              <Icon name={copiedId ? "check" : "content_copy"} size={16} />
              {copiedId ? "Copied!" : "Event ID"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
