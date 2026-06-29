import Header from "../../components/ui/Header";
import Icon from "../../components/ui/Icon";
import Avatar from "../../components/ui/Avatar";
import { useNostr } from "../../context/NostrContext";
import { useDisplayName } from "../../components/ui/DisplayName";
import { shortNpub } from "../../nostr/format";

export default function SettingsMuted() {
  const { mutes, toggleMute } = useNostr();

  return (
    <>
      <Header title="Blocked Users" />

      {mutes.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="block" size={40} />
          <p className="text-body-md">No blocked users yet.</p>
          <p className="text-mono-label text-center">Use the block icon on any note to block someone.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant">
          {mutes.map((pk) => <BlockedUserRow key={pk} pubkey={pk} onUnblock={() => toggleMute(pk)} />)}
        </div>
      )}
    </>
  );
}

function BlockedUserRow({ pubkey, onUnblock }) {
  const name = useDisplayName(pubkey);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
      <Avatar pubkey={pubkey} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-body-md truncate">{name}</p>
        <p className="text-on-surface-variant text-mono-label truncate">{shortNpub(pubkey)}</p>
      </div>
      <button
        onClick={onUnblock}
        className="border border-outline text-on-surface px-4 py-1.5 rounded-full font-bold text-label-sm hover:bg-surface-container-high shrink-0 transition-colors"
      >
        Unblock
      </button>
    </div>
  );
}
