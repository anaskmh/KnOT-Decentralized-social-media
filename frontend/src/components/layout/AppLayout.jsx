// ─────────────────────────────────────────────
// AppLayout — the 3-column shell shared by every screen
// ─────────────────────────────────────────────
// Left nav (275px) + center content (Outlet, max 600px) + right sidebar
// (350px), centered within a 1265px container, exactly like the design.
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import WalletRightSidebar from "../wallet/WalletRightSidebar";
import MobileNav from "./MobileNav";
import ComposeModal from "../ComposeModal";
import NotificationToast from "../ui/NotificationToast";

export default function AppLayout() {
  const [composeOpen, setComposeOpen] = useState(false);
  const openCompose = () => setComposeOpen(true);
  const location = useLocation();
  // The Wallet screen has its own right rail (stats / health / discovery).
  const isWallet = location.pathname.startsWith("/wallet");

  return (
    <div className="flex min-h-screen max-w-[1265px] mx-auto bg-black relative">
      <LeftSidebar onCompose={openCompose} />

      <main className="w-full max-w-[600px] min-h-screen border-r border-l border-outline-variant bg-black pb-20 lg:pb-0">
        <Outlet context={{ openCompose }} />
      </main>

      {isWallet ? <WalletRightSidebar /> : <RightSidebar />}

      <MobileNav onCompose={openCompose} />
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
      <NotificationToast />
    </div>
  );
}
