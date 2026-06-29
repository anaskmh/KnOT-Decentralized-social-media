// ─────────────────────────────────────────────
// Profile — banner, identity, follow, tabs (from user_profile_desktop)
// ─────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import NoteCard from "../components/NoteCard";
import EditProfileModal from "../components/EditProfileModal";
import ReportModal from "../components/ReportModal";
import QrCodeModal from "../components/QrCodeModal";
import { useNostr, useProfile } from "../context/NostrContext";
import { useFeed } from "../hooks/useFeed";
import { useFollowCounts } from "../hooks/useFollowCounts";
import { KIND_NOTE } from "../nostr/events";
import { useDisplayName } from "../components/ui/DisplayName";
import { compactNumber, shortNpub, toNpub, avatarColor } from "../nostr/format";

const TABS = ["Notes", "Replies", "Highlights", "Media"];
const IMAGE = /https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|avif)/i;
const isReply = (n) => n.tags.some((t) => t[0] === "e");

export default function Profile() {
  const { pubkey: routePubkey } = useParams();
  const navigate = useNavigate();
  const { identity, isFollowing, toggleFollow, isMuted, toggleMute } = useNostr();

  const pubkey = routePubkey || identity.pubHex;
  const isMe = pubkey === identity.pubHex;
  const profile = useProfile(pubkey) || {};
  const name = useDisplayName(pubkey);
  const { following, followers } = useFollowCounts(pubkey);
  const [tab, setTab] = useState("Notes");
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { url, origin, iris } or null
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const menuRef = useRef(null);
  const blocked = isMuted(pubkey);

  // Close the three-dot menu when clicking outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const closeLightbox = () => {
    if (!lightbox) return;
    if (lightbox.iris) {
      setLightboxClosing(true);
      setTimeout(() => { setLightbox(null); setLightboxClosing(false); }, 380);
    } else {
      setLightbox(null);
    }
  };

  // Route prefix for this profile's follow lists (own vs someone else's).
  const profileBase = isMe ? "/profile" : `/profile/${pubkey}`;

  const copyNpub = () => {
    navigator.clipboard.writeText(toNpub(pubkey));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const { notes } = useFeed({ kinds: [KIND_NOTE], authors: [pubkey], limit: 100 });

  const shown = useMemo(() => {
    if (tab === "Replies") return notes.filter(isReply);
    if (tab === "Media") return notes.filter((n) => IMAGE.test(n.content));
    if (tab === "Highlights") return notes.filter((n) => (n.content || "").length > 280);
    return notes.filter((n) => !isReply(n)); // Notes
  }, [notes, tab]);

  const following_me = isFollowing(pubkey);

  return (
    <>
      <Header title={name} subtitle={`${compactNumber(notes.length)} notes`} onBack={() => navigate(-1)} />

      {/* Banner */}
      <div
        className={`h-48 w-full bg-surface-container-high ${profile.banner ? "cursor-zoom-in" : ""}`}
        style={
          profile.banner
            ? { backgroundImage: `url(${profile.banner})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${avatarColor(pubkey)}33, #131313)` }
        }
        onClick={() => profile.banner && setLightbox({ url: profile.banner, origin: "top center" })}
      />

      {/* Avatar + action */}
      <div className="px-gutter relative">
        <div className="absolute -top-12">
          <button
            className="rounded-full border-4 border-black cursor-zoom-in"
            onClick={() => { const src = profile.picture; if (src) setLightbox({ url: src, origin: "bottom left", iris: true }); }}
          >
            <Avatar pubkey={pubkey} size={96} />
          </button>
        </div>
        <div className="flex flex-wrap justify-end gap-2 py-3">
          <button
            onClick={() => setQrOpen(true)}
            className="border border-outline text-on-surface w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center"
            title="QR code"
          >
            <Icon name="qr_code_2" size={18} />
          </button>

          {isMe ? (
            <button onClick={() => setEditOpen(true)} className="border border-outline text-on-surface px-4 py-1.5 rounded-full font-bold text-label-sm hover:bg-surface-container-high">
              Edit profile
            </button>
          ) : (
            <>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="border border-outline text-on-surface w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center"
                  title="More options"
                >
                  <Icon name="more_horiz" size={20} />
                </button>

                {menuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-surface-container-high border border-outline-variant rounded-2xl shadow-xl overflow-hidden z-20">
                    <button
                      onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-highest transition-colors"
                    >
                      <Icon name="flag" size={18} className="text-white" />
                      <span className="font-label-sm text-label-sm font-bold text-white">Report user</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); toggleMute(pubkey); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-highest transition-colors"
                    >
                      <Icon name={blocked ? "lock_open" : "block"} size={18} className="text-error" />
                      <span className="font-label-sm text-label-sm font-bold text-error">
                        {blocked ? "Unblock user" : "Block user"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/messages", { state: { openPubkey: pubkey } })}
                className="border border-outline text-on-surface w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center"
                title="Message"
              >
                <Icon name="chat_bubble" size={18} />
              </button>

              <button
                onClick={() => toggleFollow(pubkey)}
                className={`px-5 py-1.5 rounded-full font-bold text-label-sm active:scale-95 transition-all ${
                  following_me ? "border border-outline text-on-surface" : "bg-on-surface text-surface"
                }`}
              >
                {following_me ? "Following" : "Follow"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Identity */}
      <div className="px-gutter pt-6">
        <div className="flex items-center gap-2">
          <h1 className="font-h1 text-h1">{name}</h1>
          {profile.nip05 && <Icon name="verified" fill className="text-primary" size={20} />}
        </div>
        {/* npub + copy-to-clipboard (works on any profile) */}
        <button
          onClick={copyNpub}
          title="Copy public key (npub)"
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors group/npub"
        >
          <span className="font-mono-label text-mono-label">{shortNpub(pubkey)}</span>
          <Icon name={copied ? "check" : "content_copy"} size={14} className={copied ? "text-tertiary" : ""} />
        </button>
        {profile.about && <p className="mt-3 text-body-lg text-on-surface whitespace-pre-wrap">{profile.about}</p>}

        <div className="flex flex-wrap gap-4 mt-3 text-on-surface-variant text-body-md">
          {profile.nip05 && (
            <span className="flex items-center gap-1">
              <Icon name="verified_user" size={16} /> {profile.nip05}
            </span>
          )}
          {profile.lud16 && (
            <span className="flex items-center gap-1 text-tertiary-fixed">
              <Icon name="bolt" fill size={16} /> {profile.lud16}
            </span>
          )}
        </div>

        <div className="flex gap-5 mt-3 text-body-md">
          <button onClick={() => navigate(`${profileBase}/following`)} className="hover:underline">
            <b className="text-on-surface">{compactNumber(following)}</b> <span className="text-on-surface-variant">Following</span>
          </button>
          <button onClick={() => navigate(`${profileBase}/followers`)} className="hover:underline">
            <b className="text-on-surface">{compactNumber(followers)}</b> <span className="text-on-surface-variant">Followers</span>
          </button>
        </div>
      </div>

      {blocked ? (
        /* Blocked — hide their posts entirely, just say so. */
        <div className="p-10 flex flex-col items-center text-on-surface-variant gap-3 mt-4">
          <Icon name="block" size={40} className="text-error" />
          <p className="text-body-md font-bold text-on-surface">User is blocked</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-outline-variant mt-4 sticky top-14 glass-header z-30">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className="flex-1 py-3 font-bold text-label-sm relative hover:bg-surface-container-low transition-colors">
                <span className={tab === t ? "text-on-surface" : "text-on-surface-variant"}>{t}</span>
                {tab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {/* Notes */}
          {shown.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
              <Icon name="inbox" size={40} />
              <p className="text-body-md">Nothing here yet.</p>
            </div>
          ) : (
            shown.map((note) => <NoteCard key={note.id} note={note} />)
          )}
        </>
      )}

      {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}
      {reportOpen && <ReportModal pubkey={pubkey} onClose={() => setReportOpen(false)} />}
      {qrOpen && <QrCodeModal pubkey={pubkey} onClose={() => setQrOpen(false)} />}

      {/* Image lightbox */}
      {lightbox && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center ${lightbox.iris ? (lightboxClosing ? "iris-backdrop-out" : "iris-backdrop-in") : "lightbox-backdrop"}`}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 z-10"
            onClick={closeLightbox}
          >
            <Icon name="close" size={28} />
          </button>
          <img
            src={lightbox.url}
            alt="Full size"
            className={`object-contain rounded-full ${lightbox.iris ? (lightboxClosing ? "iris-img-out" : "iris-img-in") : "lightbox-img rounded-xl"}`}
            style={{ maxWidth: "95vw", maxHeight: "95vh", transformOrigin: lightbox.origin }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
