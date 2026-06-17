// ─────────────────────────────────────────────
// App — routing
// ─────────────────────────────────────────────
// No identity → Login. Otherwise the 3-column AppLayout wraps every screen.
import { Routes, Route, Navigate } from "react-router-dom";

import { useNostr } from "./context/NostrContext";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import Wallet from "./pages/Wallet";
import Relays from "./pages/Relays";
import Profile from "./pages/Profile";
import FollowList from "./pages/FollowList";
import Thread from "./pages/Thread";
import Settings from "./pages/Settings";
import SettingsAccount from "./pages/settings/SettingsAccount";
import SettingsAppearance, { initTheme } from "./pages/settings/SettingsAppearance";
import SettingsMuted from "./pages/settings/SettingsMuted";
import SettingsModeration from "./pages/settings/SettingsModeration";
import SettingsZaps from "./pages/settings/SettingsZaps";
import SettingsNotifications from "./pages/settings/SettingsNotifications";

// Apply saved theme immediately on load.
initTheme();

export default function App() {
  const { identity } = useNostr();

  if (!identity) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/relays" element={<Relays />} />
        <Route path="/profile" element={<Profile />} />
        {/* Static segments outrank :pubkey in react-router, so own-profile
            follow lists resolve correctly. */}
        <Route path="/profile/followers" element={<FollowList mode="followers" />} />
        <Route path="/profile/following" element={<FollowList mode="following" />} />
        <Route path="/profile/:pubkey/followers" element={<FollowList mode="followers" />} />
        <Route path="/profile/:pubkey/following" element={<FollowList mode="following" />} />
        <Route path="/profile/:pubkey" element={<Profile />} />
        <Route path="/note/:id" element={<Thread />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/account" element={<SettingsAccount />} />
        <Route path="/settings/appearance" element={<SettingsAppearance />} />
        <Route path="/settings/muted" element={<SettingsMuted />} />
        <Route path="/settings/moderation" element={<SettingsModeration />} />
        <Route path="/settings/zaps" element={<SettingsZaps />} />
        <Route path="/settings/notifications" element={<SettingsNotifications />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
