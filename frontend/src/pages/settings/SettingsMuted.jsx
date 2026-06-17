import { useState } from "react";
import Header from "../../components/ui/Header";
import Icon from "../../components/ui/Icon";
import Avatar from "../../components/ui/Avatar";
import { useNostr } from "../../context/NostrContext";
import { useDisplayName } from "../../components/ui/DisplayName";
import { shortNpub } from "../../nostr/format";

const TABS = ["Users", "Words", "Hashtags", "Threads"];

export default function SettingsMuted() {
  const { mutes, toggleMute } = useNostr();
  const [tab, setTab] = useState("users");

  return (
    <>
      <Header title="Muted Content" />

      {/* Sub-tabs */}
      <div className="flex border-b border-outline-variant">
        {TABS.map((t) => {
          const id = t.toLowerCase();
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-3 text-label-sm font-bold relative hover:bg-surface-container-low transition-colors"
            >
              <span className={tab === id ? "text-on-surface" : "text-on-surface-variant"}>{t}</span>
              {tab === id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      {tab === "users" && (
        <>
          {mutes.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
              <Icon name="person_off" size={40} />
              <p className="text-body-md">No muted users yet.</p>
              <p className="text-mono-label text-center">Use the person_off icon on any note to mute someone.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-outline-variant">
              {mutes.map((pk) => <MutedUserRow key={pk} pubkey={pk} onUnmute={() => toggleMute(pk)} />)}
            </div>
          )}
        </>
      )}

      {tab === "words" && <PlaceholderTab icon="text_fields" label="Muted words" />}
      {tab === "hashtags" && <PlaceholderTab icon="tag" label="Muted hashtags" />}
      {tab === "threads" && <PlaceholderTab icon="forum" label="Muted threads" />}
    </>
  );
}

function MutedUserRow({ pubkey, onUnmute }) {
  const name = useDisplayName(pubkey);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
      <Avatar pubkey={pubkey} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-body-md truncate">{name}</p>
        <p className="text-on-surface-variant text-mono-label truncate">{shortNpub(pubkey)}</p>
      </div>
      <button
        onClick={onUnmute}
        className="border border-outline text-on-surface px-4 py-1.5 rounded-full font-bold text-label-sm hover:bg-surface-container-high shrink-0 transition-colors"
      >
        Unmute
      </button>
    </div>
  );
}

function PlaceholderTab({ icon, label }) {
  return (
    <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
      <Icon name={icon} size={40} />
      <p className="text-body-md">{label} — coming soon.</p>
    </div>
  );
}
