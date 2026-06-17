// ─────────────────────────────────────────────
// LeftSidebar — fixed 275px navigation (from home_feed_desktop)
// ─────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import Icon from "../ui/Icon";
import Avatar from "../ui/Avatar";
import Logo from "../ui/Logo";
import { useNostr } from "../../context/NostrContext";
import { useDisplayName } from "../ui/DisplayName";
import { shortNpub } from "../../nostr/format";

const NAV = [
  { label: "Home", icon: "home", path: "/" },
  { label: "Explore", icon: "explore", path: "/explore" },
  { label: "Notifications", icon: "notifications", path: "/notifications" },
  // { label: "Messages", icon: "mail", path: "/messages" },
  { label: "Bookmarks", icon: "bookmark", path: "/bookmarks" },
  // { label: "Wallet", icon: "account_balance_wallet", path: "/wallet" },
  { label: "Relays", icon: "lan", path: "/relays" },
  { label: "Profile", icon: "person", path: "/profile" },
  { label: "Settings", icon: "settings", path: "/settings" },
];

export default function LeftSidebar({ onCompose }) {
  const { identity, logout, unreadCount } = useNostr();
  const navigate = useNavigate();
  const name = useDisplayName(identity?.pubHex);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close the popover when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <aside className="sticky top-0 h-screen w-[275px] flex-shrink-0 border-r border-outline-variant flex-col gap-unit px-edge-margin py-gutter hidden lg:flex overflow-y-auto">
      {/* Brand logo — click to go home */}
      <NavLink to="/" className="px-gutter py-unit block">
        <Logo size={34} />
        <p className="font-body-md text-body-md text-on-surface-variant opacity-60 mt-1">Decentralized</p>
      </NavLink>

      {/* Nav */}
      <nav className="flex flex-col gap-unit mt-4">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-4 px-gutter py-3 cursor-pointer active:scale-95 duration-150 transition-colors hover:bg-surface-container-high rounded-full ${
                isActive ? "text-primary font-bold" : "text-on-surface-variant font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon name={item.icon} fill={isActive} />
                  {item.path === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="font-h2 text-h2">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Post button */}
      <button
        onClick={onCompose}
        className="mt-6 bg-primary-container text-on-primary-container font-h2 text-h2 py-3 rounded-full font-bold active:scale-95 transition-all w-[90%]"
      >
        Post
      </button>

      {/* User chip + logout popover */}
      {identity && (
        <div className="mt-auto mb-4 relative" ref={menuRef}>
          {/* Logout popover — appears above the user chip */}
          {showMenu && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 bg-surface-container-high border border-outline-variant rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
              style={{ animation: "popoverIn 150ms ease-out" }}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <Icon name="logout" size={20} className="text-error" />
                <span className="font-label-sm text-label-sm font-bold text-error">
                  Log out @{shortNpub(identity.pubHex)}
                </span>
              </button>
            </div>
          )}

          {/* User chip — toggles the popover */}
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-high rounded-full cursor-pointer transition-colors text-left"
          >
            <Avatar pubkey={identity.pubHex} size={40} />
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm font-bold truncate">{name}</span>
              <span className="font-mono-label text-mono-label text-on-surface-variant opacity-60 truncate">
                {shortNpub(identity.pubHex)}
              </span>
            </div>
            <Icon name="more_horiz" className="ml-auto text-on-surface-variant" size={18} />
          </button>
        </div>
      )}

      {/* Popover animation keyframes */}
      <style>{`
        @keyframes popoverIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </aside>
  );
}
