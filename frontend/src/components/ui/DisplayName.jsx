// Shows a user's display name (from kind-0) or a short npub fallback.
import { useProfile, useProfileLoading } from "../../context/NostrContext";
import { shortNpub } from "../../nostr/format";

export function useDisplayName(pubkey) {
  const profile = useProfile(pubkey);
  return profile?.name || profile?.display_name || shortNpub(pubkey || "");
}

export function Handle({ pubkey, className = "" }) {
  const profile = useProfile(pubkey);
  const handle = profile?.nip05 || shortNpub(pubkey || "");
  if (!handle) return <span className={className} />;
  return <span className={className}>@{String(handle).replace(/^_@/, "")}</span>;
}

export default function DisplayName({ pubkey, className = "" }) {
  const name = useDisplayName(pubkey);
  const loading = useProfileLoading(pubkey);

  if (loading) {
    return (
      <span className={`inline-block h-3.5 w-24 rounded bg-surface-container-high animate-pulse align-middle ${className}`} />
    );
  }

  return <span className={className}>{name}</span>;
}
