// ─────────────────────────────────────────────
// Settings — main vertical list (drill-down style)
// ─────────────────────────────────────────────
import { useNavigate } from "react-router-dom";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import { useNostr } from "../context/NostrContext";

const ITEMS = [
  { label: "Account",              path: "/settings/account",    icon: "manage_accounts" },
  { label: "Appearance",           path: "/settings/appearance", icon: "palette" },
  { label: "Muted Content",        path: "/settings/muted",      icon: "volume_off" },
  { label: "Content Moderation",   path: "/settings/moderation", icon: "shield" },
  { label: "Zaps",                 path: "/settings/zaps",       icon: "bolt" },
  { label: "Network & Relays",     path: "/relays",              icon: "lan" },
  { label: "Notifications",        path: "/settings/notifications", icon: "notifications" },
];

const VERSION = "1.0.0";

export default function Settings() {
  const navigate = useNavigate();
  const { logout, identity } = useNostr();

  return (
    <>
      <Header title="Settings" />

      <div className="flex flex-col divide-y divide-outline-variant">
        {ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-4 px-4 py-4 hover:bg-surface-container-low transition-colors text-left"
          >
            <Icon name={item.icon} size={22} className="text-on-surface-variant" />
            <span className="flex-1 text-on-surface text-body-md font-medium">{item.label}</span>
            <Icon name="chevron_right" size={22} className="text-on-surface-variant" />
          </button>
        ))}
      </div>

      {/* Logout + version */}
      <div className="flex items-center justify-between px-4 py-6 mt-4">
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all"
        >
          Logout
        </button>
        <span className="text-on-surface-variant text-mono-label">
          Version <span className="font-bold text-on-surface">{VERSION}</span>
        </span>
      </div>
    </>
  );
}
