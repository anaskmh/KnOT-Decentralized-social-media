// ─────────────────────────────────────────────
// SettingsModal — content & safety settings
// ─────────────────────────────────────────────
import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import { useNostr } from "../context/NostrContext";
import { useDisplayName } from "./ui/DisplayName";
import { shortNpub } from "../nostr/format";

export default function SettingsModal({ onClose }) {
  const { settings, updateSetting, mutes, toggleMute } = useNostr();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
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
          <span className="font-bold">Content & safety</span>
          <span className="w-6" />
        </div>

        <div className="p-gutter flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <Toggle
            label="Hide sensitive content"
            description="Collapse notes labeled sensitive (NIP-36) or matching the adult-content screen behind a Show button."
            checked={settings.hideSensitive}
            onChange={(v) => updateSetting("hideSensitive", v)}
          />
          <Toggle
            label="Blur media from people you don't follow"
            description="Images from strangers stay blurred until you click them."
            checked={settings.blurMedia}
            onChange={(v) => updateSetting("blurMedia", v)}
          />

          {/* Muted authors */}
          <div>
            <p className="font-bold text-on-surface mb-1">Muted authors · {mutes.length}</p>
            {mutes.length === 0 ? (
              <p className="text-on-surface-variant text-body-md">
                Nobody muted. Use the <Icon name="person_off" size={14} /> icon on any note.
              </p>
            ) : (
              mutes.map((pk) => <MutedRow key={pk} pubkey={pk} onUnmute={() => toggleMute(pk)} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left w-full">
      <span
        className={`mt-0.5 w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${checked ? "bg-primary" : "bg-surface-container-high"}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-black transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </span>
      <span>
        <span className="font-bold text-on-surface block">{label}</span>
        <span className="text-on-surface-variant text-label-sm">{description}</span>
      </span>
    </button>
  );
}

function MutedRow({ pubkey, onUnmute }) {
  const name = useDisplayName(pubkey);
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar pubkey={pubkey} size={32} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-label-sm truncate">{name}</p>
        <p className="text-on-surface-variant text-mono-label truncate">{shortNpub(pubkey)}</p>
      </div>
      <button
        onClick={onUnmute}
        className="border border-outline text-on-surface px-3 py-1 rounded-full font-bold text-label-sm hover:bg-surface-container-high"
      >
        Unmute
      </button>
    </div>
  );
}
