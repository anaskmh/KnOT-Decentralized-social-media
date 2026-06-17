import { useState } from "react";
import Header from "../../components/ui/Header";
import { useNostr } from "../../context/NostrContext";

const NOTIF_PREFS_KEY = "knot_notif_prefs";

const defaults = {
  followers:                true,
  zaps:                     true,
  reactions:                true,
  reposts:                  true,
  replies:                  true,
  mentions:                 true,
  repliesOfReplies:         true,
  ignoreManyMentions:       true,
  dmFromFollowsOnly:        true,
  reactionsFromFollowsOnly: false,
};

function loadPrefs() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}") };
  } catch { return defaults; }
}

export function getNotifPrefs() { return loadPrefs(); }

export default function SettingsNotifications() {
  const { notifPrefs, updateNotifPrefs } = useNostr();
  const [prefs, setPrefs] = useState(() => ({ ...loadPrefs(), ...notifPrefs }));

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    updateNotifPrefs(next); // updates context → re-subscribes with new kinds
  };

  const SHOW_FOR = [
    { key: "followers", emoji: "👤", label: "New Followers" },
    { key: "zaps",      emoji: "⚡", label: "Zaps" },
    { key: "reactions", emoji: "❤️", label: "Reactions" },
    { key: "reposts",   emoji: "🔁", label: "Reposts" },
    { key: "replies",   emoji: "💬", label: "Replies" },
    { key: "mentions",  emoji: "🔔", label: "Mentions" },
  ];

  const PREFERENCES = [
    { key: "repliesOfReplies",        label: "Include replies to replies" },
    { key: "ignoreManyMentions",      label: "Ignore notes with more than 10 mentions" },
    { key: "dmFromFollowsOnly",       label: "Only show DM notifications from users I follow" },
    { key: "reactionsFromFollowsOnly",label: "Only show reactions from users I follow" },
  ];

  return (
    <>
      <Header title="Notifications" />

      <div className="flex flex-col gap-6 p-4">

        {/* Show notifications for */}
        <div className="flex flex-col gap-1">
          <p className="text-on-surface font-bold text-body-md mb-2">Show notifications for:</p>
          {SHOW_FOR.map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-surface-container-low transition-colors text-left"
            >
              <Checkbox checked={prefs[key]} />
              <span className="text-xl w-7 text-center">{emoji}</span>
              <span className="text-body-md text-on-surface">{label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant" />

        {/* Notification preferences */}
        <div className="flex flex-col gap-1">
          <p className="text-on-surface font-bold text-body-md mb-2">Notification preferences:</p>
          {PREFERENCES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-surface-container-low transition-colors text-left"
            >
              <Checkbox checked={prefs[key]} />
              <span className="text-body-md text-on-surface">{label}</span>
            </button>
          ))}
        </div>

      </div>
    </>
  );
}

function Checkbox({ checked }) {
  return (
    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-outline-variant"}`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}
