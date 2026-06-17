// ─────────────────────────────────────────────
// UserRow — one person, used everywhere people are listed
// ─────────────────────────────────────────────
// The single component for: followers/following lists, search results, and
// the sidebar "who to follow" cards. Avatar + name + npub (+ bio) + a
// Follow/Following button that turns into "Unfollow" on hover.
//
//   <UserRow pubkey={pk} />            full list row (avatar 48, shows bio)
//   <UserRow pubkey={pk} compact />    sidebar row    (avatar 40, no bio)
import { useNavigate } from "react-router-dom";

import Avatar from "./ui/Avatar";
import { useNostr, useProfile } from "../context/NostrContext";
import { useDisplayName } from "./ui/DisplayName";
import { shortNpub } from "../nostr/format";

function FollowButton({ pubkey }) {
  const { identity, isFollowing, toggleFollow } = useNostr();
  if (pubkey === identity?.pubHex) return null;
  const following = isFollowing(pubkey);
  return (
    <button
      onClick={() => toggleFollow(pubkey)}
      className={`group/btn shrink-0 px-4 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
        following
          ? "border border-outline-variant text-on-surface hover:bg-error-container hover:text-on-error-container hover:border-error-container"
          : "bg-on-surface text-background hover:opacity-90"
      }`}
    >
      {following ? (
        <>
          <span className="group-hover/btn:hidden">Following</span>
          <span className="hidden group-hover/btn:inline">Unfollow</span>
        </>
      ) : (
        "Follow"
      )}
    </button>
  );
}

export default function UserRow({ pubkey, compact = false }) {
  const navigate = useNavigate();
  const profile = useProfile(pubkey);
  const name = useDisplayName(pubkey);
  const open = () => navigate(`/profile/${pubkey}`);

  // Compact: tight row for the right-sidebar "who to follow" cards.
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <button onClick={open} className="flex items-center gap-3 min-w-0 text-left">
          <Avatar pubkey={pubkey} size={40} />
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate leading-tight">{name}</p>
            <p className="text-on-surface-variant text-mono-label truncate">{shortNpub(pubkey)}</p>
          </div>
        </button>
        <FollowButton pubkey={pubkey} />
      </div>
    );
  }

  // Full: list row with bio (followers/following/search).
  return (
    <div className="p-edge-margin hover:bg-surface-container/30 transition-colors flex gap-3">
      <button onClick={open} className="flex-shrink-0">
        <Avatar pubkey={pubkey} size={48} />
      </button>
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button onClick={open} className="text-left min-w-0">
            <h3 className="font-bold text-on-surface hover:underline truncate">{name}</h3>
            <p className="font-mono-label text-on-surface-variant truncate">{shortNpub(pubkey)}</p>
          </button>
          <FollowButton pubkey={pubkey} />
        </div>
        {profile?.about && (
          <p className="mt-2 font-body-md text-on-surface-variant line-clamp-2">{profile.about}</p>
        )}
      </div>
    </div>
  );
}
