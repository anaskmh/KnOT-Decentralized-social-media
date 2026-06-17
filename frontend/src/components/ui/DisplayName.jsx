// Shows a user's display name (from kind-0) or a short npub fallback.
import { useProfile } from "../../context/NostrContext";
import { shortNpub } from "../../nostr/format";

export function useDisplayName(pubkey) {
  const profile = useProfile(pubkey);
  return profile?.name || profile?.display_name || shortNpub(pubkey || "");
}

export function Handle({ pubkey, className = "" }) {
  const profile = useProfile(pubkey);
  const handle = profile?.nip05 || shortNpub(pubkey || "");
  return <span className={className}>@{handle.replace(/^_@/, "")}</span>;
}

export default function DisplayName({ pubkey, className = "" }) {
  const name = useDisplayName(pubkey);
  return <span className={className}>{name}</span>;
}
