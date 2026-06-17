import Header from "../../components/ui/Header";
import { useNostr } from "../../context/NostrContext";

export default function SettingsModeration() {
  const { settings, updateSetting } = useNostr();
  return (
    <>
      <Header title="Content Moderation" />
      <div className="flex flex-col gap-5 p-4">
        <p className="text-on-surface-variant text-mono-label uppercase tracking-widest text-xs">Safety Filters</p>
        <Toggle
          label="Hide sensitive content"
          description="Collapse notes labeled sensitive (NIP-36) behind a Show button."
          checked={settings.hideSensitive}
          onChange={(v) => updateSetting("hideSensitive", v)}
        />
        <Toggle
          label="Blur media from people you don't follow"
          description="Images from strangers stay blurred until you tap them."
          checked={settings.blurMedia}
          onChange={(v) => updateSetting("blurMedia", v)}
        />
      </div>
    </>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left w-full">
      <span className={`mt-0.5 w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${checked ? "bg-primary" : "bg-surface-container-high"}`}>
        <span className={`block w-5 h-5 rounded-full bg-black transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="font-bold text-on-surface block">{label}</span>
        <span className="text-on-surface-variant text-label-sm">{description}</span>
      </span>
    </button>
  );
}
