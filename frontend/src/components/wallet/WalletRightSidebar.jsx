// ─────────────────────────────────────────────
// WalletRightSidebar — Wallet Stats + Network Health + Discovery
// ─────────────────────────────────────────────
// Stats come from the real wallet ledger; relay latency is really measured.
import { useEffect, useMemo, useState } from "react";

import Icon from "../ui/Icon";
import UserRow from "../UserRow";
import { useWallet } from "../../context/WalletContext";
import { useNostr } from "../../context/NostrContext";
import { useFeed } from "../../hooks/useFeed";
import { pingRelay } from "../../nostr/relay";
import { KIND_NOTE } from "../../nostr/events";
import { compactNumber } from "../../nostr/format";

export default function WalletRightSidebar() {
  const { transactions } = useWallet();
  const { relayStatuses } = useNostr();
  const [latency, setLatency] = useState(null);

  // Measure the KnOT relay latency for the Network Health card.
  useEffect(() => {
    const knot = relayStatuses.find((r) => r.name === "KnOT") || relayStatuses[0];
    if (knot) pingRelay(knot.url).then(setLatency);
  }, [relayStatuses]);

  // Build a 7-day bar chart of incoming sats from the ledger.
  const { bars, weeklyTotal } = useMemo(() => buildWeekly(transactions), [transactions]);
  const onlinePeers = relayStatuses.filter((r) => r.status === "connected").length;

  return (
    <aside className="w-[350px] hidden xl:flex flex-col gap-gutter p-edge-margin overflow-y-auto sticky top-0 h-screen custom-scrollbar">
      {/* Wallet Stats */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
        <h3 className="font-h2 text-h2 mb-4">Wallet Stats</h3>
        <div className="flex justify-between items-end h-24 gap-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-full rounded-t-lg ${i === bars.length - 1 ? "bg-primary" : "bg-primary/20"}`}
              style={{ height: `${Math.max(6, h)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest">Weekly Received</p>
            <p className="text-xl font-bold text-on-surface">{compactNumber(weeklyTotal)} Sats</p>
          </div>
          <div className="text-tertiary text-sm flex items-center gap-1">
            <Icon name="trending_up" size={16} /> live
          </div>
        </div>
      </div>

      {/* Network Health */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-h2 text-h2">Network Health</h3>
          <span className="flex h-2 w-2 rounded-full bg-tertiary animate-pulse" />
        </div>
        <div className="space-y-3">
          <HealthRow icon="sensors" iconClass="text-secondary" label="Relay: KnOT" value={latency != null ? `${latency}ms` : "…"} valueClass="text-tertiary" />
          <HealthRow icon="hub" label="Node Peers" value={`${onlinePeers}/${relayStatuses.length}`} />
          <HealthRow icon="security" label="Encryption" value="AES-256" valueClass="text-tertiary" />
        </div>
      </div>

      {/* Discovery */}
      <Discovery />
    </aside>
  );
}

function HealthRow({ icon, iconClass = "text-on-surface-variant", label, value, valueClass = "text-on-surface" }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-surface-container-high rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <Icon name={icon} className={iconClass} />
        <span className="text-on-surface-variant font-body-md">{label}</span>
      </div>
      <span className={`${valueClass} font-mono-label`}>{value}</span>
    </div>
  );
}

function Discovery() {
  const { notes } = useFeed({ kinds: [KIND_NOTE], limit: 60 });
  const authors = useMemo(() => {
    const seen = [];
    for (const n of notes) {
      if (!seen.includes(n.pubkey)) seen.push(n.pubkey);
      if (seen.length >= 3) break;
    }
    return seen;
  }, [notes]);

  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
      <h3 className="font-h2 text-h2 mb-4">Discovery</h3>
      <div className="space-y-4">
        {authors.map((pk) => (
          <UserRow key={pk} pubkey={pk} compact />
        ))}
      </div>
    </div>
  );
}

// Sum incoming sats per day for the last 7 days → normalized bar heights.
function buildWeekly(transactions) {
  const dayMs = 86_400_000;
  const today = Math.floor(Date.now() / dayMs);
  const perDay = new Array(7).fill(0);
  let weeklyTotal = 0;

  for (const tx of transactions) {
    if (tx.type !== "incoming" || tx.description === "Starting balance") continue;
    const day = Math.floor((tx.created_at * 1000) / dayMs);
    const idx = 6 - (today - day);
    if (idx >= 0 && idx < 7) {
      const sats = Math.floor(tx.amount / 1000);
      perDay[idx] += sats;
      weeklyTotal += sats;
    }
  }

  const max = Math.max(...perDay, 1);
  const bars = perDay.map((v) => (v / max) * 100);
  return { bars, weeklyTotal };
}
