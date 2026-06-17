// ─────────────────────────────────────────────
// Relays — manage the relay pool (from relay_management_desktop)
// ─────────────────────────────────────────────
// Real data: live connection status from the pool, measured latency via a
// WebSocket ping, add/remove relays, and connect suggested ones.
import { useEffect, useState } from "react";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import RelayMesh from "../components/RelayMesh";
import { useNostr } from "../context/NostrContext";
import { pingRelay } from "../nostr/relay";

const SUGGESTIONS = [
  { name: "nostr.band", url: "wss://relay.nostr.band" },
  { name: "nostr.wine", url: "wss://nostr.wine" },
  { name: "purplepag.es", url: "wss://purplepag.es" },
];

export default function Relays() {
  const { relay, relayStatuses } = useNostr();
  const [latencies, setLatencies] = useState({});
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Ping every relay for latency, refreshed when the pool changes.
  useEffect(() => {
    let alive = true;
    relayStatuses.forEach(async (r) => {
      const ms = await pingRelay(r.url);
      if (alive) setLatencies((cur) => ({ ...cur, [r.url]: ms }));
    });
    return () => {
      alive = false;
    };
  }, [relayStatuses]);

  const online = relayStatuses.filter((r) => r.status === "connected");
  const avgLatency = (() => {
    const vals = online.map((r) => latencies[r.url]).filter((v) => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();

  const addRelay = (e) => {
    e.preventDefault();
    let url = newUrl.trim();
    if (!url) return;
    if (!/^wss?:\/\//.test(url)) url = `wss://${url}`;
    relay.addRelay(newName.trim() || url.replace(/^wss?:\/\//, ""), url);
    setNewName("");
    setNewUrl("");
  };

  const inPool = (url) => relayStatuses.some((r) => r.url === url);

  return (
    <>
      <Header title="Relay Mesh" right={<Icon name="hub" className="text-tertiary-fixed" />} />

      <div className="p-gutter flex flex-col gap-4">
        <RelayMesh relays={relayStatuses} />

        {/* Network health */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Active Nodes" value={`${online.length}/${relayStatuses.length}`} icon="lan" />
          <Stat label="Avg. Latency" value={avgLatency != null ? `${avgLatency}ms` : "—"} icon="speed" accent="text-secondary" />
          <Stat label="Reliability" value={`${Math.round((online.length / Math.max(relayStatuses.length, 1)) * 100)}%`} icon="health_and_safety" accent="text-tertiary" />
        </div>

        {/* Active relays */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-h2 text-h2">Active Relays</h3>
          </div>
          <div className="flex flex-col gap-2">
            {relayStatuses.map((r) => (
              <RelayRow key={r.url} relay={r} latency={latencies[r.url]} onRemove={() => relay.removeRelay(r.url)} />
            ))}
          </div>
        </div>

        {/* Add relay */}
        <form onSubmit={addRelay} className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter flex flex-col gap-2">
          <h3 className="font-bold text-on-surface">Add a relay</h3>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (optional)" className="w-32 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:border-primary" />
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="wss://relay.example.com" className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:border-primary" />
            <button className="bg-primary text-on-primary px-4 rounded-lg font-bold text-label-sm">Add</button>
          </div>
        </form>

        {/* Suggestions */}
        <div>
          <h3 className="font-h2 text-h2 mb-2">Network Suggestions</h3>
          <div className="grid grid-cols-3 gap-2">
            {SUGGESTIONS.map((s) => (
              <div key={s.url} className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
                <Icon name="dns" className="text-primary" />
                <div>
                  <p className="font-bold text-on-surface text-label-sm truncate">{s.name}</p>
                  <p className="text-on-surface-variant text-mono-label truncate">{s.url.replace("wss://", "")}</p>
                </div>
                <button
                  onClick={() => relay.addRelay(s.name, s.url)}
                  disabled={inPool(s.url)}
                  className="mt-1 border border-outline text-on-surface py-1.5 rounded-full font-bold text-label-sm disabled:opacity-40 hover:bg-surface-container-high"
                >
                  {inPool(s.url) ? "Connected" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, icon, accent = "text-primary" }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3">
      <Icon name={icon} className={accent} size={20} />
      <p className="text-on-surface-variant text-mono-label mt-1">{label}</p>
      <p className="font-h2 text-h2 text-on-surface">{value}</p>
    </div>
  );
}

function RelayRow({ relay, latency, onRemove }) {
  const connected = relay.status === "connected";
  // latency bar width: faster = fuller (cap at 400ms).
  const pct = latency != null ? Math.max(8, 100 - Math.min(latency, 400) / 4) : 0;
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${connected ? "bg-tertiary" : "bg-error"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-on-surface truncate">{relay.name}</span>
          <span className="text-mono-label text-tertiary-fixed border border-outline-variant rounded px-1">READ/WRITE</span>
        </div>
        <p className="text-on-surface-variant text-mono-label truncate">{relay.url}</p>
        <div className="h-1 bg-surface-container-high rounded-full mt-1.5 overflow-hidden">
          <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-mono-label text-on-surface">{latency != null ? `${latency}ms` : connected ? "…" : "offline"}</p>
        <button onClick={onRemove} className="text-on-surface-variant hover:text-error mt-1">
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
