// ─────────────────────────────────────────────
// Avatar — circular profile image with a colored fallback
// ─────────────────────────────────────────────
// If the user's kind-0 profile has a picture we show it; otherwise we draw a
// deterministic colored circle with their initials (so every pubkey looks
// consistent across the app).
import { useProfile } from "../../context/NostrContext";
import { avatarColor, avatarInitials } from "../../nostr/format";

export default function Avatar({ pubkey, size = 40, className = "" }) {
  const profile = useProfile(pubkey);
  const dimension = { width: size, height: size };

  if (profile?.picture) {
    return (
      <img
        src={profile.picture}
        alt="avatar"
        style={dimension}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      style={{ ...dimension, backgroundColor: avatarColor(pubkey || "") }}
      className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-on-primary ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{avatarInitials(pubkey || "00")}</span>
    </div>
  );
}
