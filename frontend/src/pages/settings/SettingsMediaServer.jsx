// ─────────────────────────────────────────────
// SettingsMediaServer — pick which media servers to upload to
// ─────────────────────────────────────────────
// Same model as the Relay Mesh: you can be connected to MULTIPLE servers at
// once. Every connected node lights up; uploads go out to all of them in
// parallel, same as how a note gets published to every connected relay.
import { useEffect, useMemo, useState } from "react";
import Header from "../../components/ui/Header";
import Icon from "../../components/ui/Icon";
import MediaServerMesh from "../../components/MediaServerMesh";
import {
  loadMediaServers, saveMediaServers, pingMediaServer,
  loadCustomServers, addCustomServer, removeCustomServer,
  BLOSSOM_URL, KNOT_MEDIA_URL,
} from "../../nostr/upload";

const BUILT_IN = [
  {
    value: "blossom",
    name: "Blossom",
    url: BLOSSOM_URL.replace("https://", ""),
    desc: "Default — zero-maintenance, hosted on the Blossom network",
  },
  {
    value: "knot",
    name: "media-s3-knot",
    url: KNOT_MEDIA_URL.replace("http://", ""),
    desc: "Our own server — local, for testing only",
  },
];

export default function SettingsMediaServer() {
  const [connected, setConnected] = useState(loadMediaServers);
  const [customServers, setCustomServers] = useState(loadCustomServers);
  // null = checking, true = reachable, false = down (shows the red flag).
  const [reachable, setReachable] = useState({});
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Custom servers use their URL as the "value" (same idea as a relay's url
  // being its identity) — merge them with the two built-ins for one list.
  const SERVERS = useMemo(
    () => [
      ...BUILT_IN,
      ...customServers.map((s) => ({
        value: s.url,
        name: s.name,
        url: s.url.replace(/^https?:\/\//, ""),
        desc: "Custom Blossom (BUD-01) server",
        custom: true,
      })),
    ],
    [customServers],
  );

  // Ping every server on load and every 10s after, so a server that goes
  // down while you're looking at this page flips to "Unreachable" live.
  useEffect(() => {
    let alive = true;
    const checkAll = () => {
      SERVERS.forEach((s) => {
        pingMediaServer(s.value).then((ok) => {
          if (alive) setReachable((cur) => ({ ...cur, [s.value]: ok }));
        });
      });
    };
    checkAll();
    const interval = setInterval(checkAll, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [SERVERS]);

  // A node only counts as truly "connected" in the mesh if it's both
  // toggled on AND actually reachable — matches how an offline relay still
  // shows red even though it's in your relay list.
  const effectiveConnected = connected.filter((v) => reachable[v] !== false);

  const toggle = (value) => {
    setConnected((current) => {
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      // Always keep at least one server connected — uploads need somewhere to go.
      if (next.length === 0) return current;
      saveMediaServers(next);
      return next;
    });
  };

  const addServer = (e) => {
    e.preventDefault();
    let url = newUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    setCustomServers(addCustomServer(newName.trim(), url));
    setNewName("");
    setNewUrl("");
  };

  const removeServer = (url) => {
    setCustomServers(removeCustomServer(url));
    setConnected(loadMediaServers());
  };

  return (
    <>
      <Header title="Media Server" right={<Icon name="hub" className="text-tertiary-fixed" />} />

      <div className="p-gutter flex flex-col gap-4">
        <MediaServerMesh servers={SERVERS} connected={effectiveConnected} />

        {/* Network health, mirroring Relay Mesh's stat row */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Active Servers" value={`${effectiveConnected.length}/${SERVERS.length}`} icon="cloud_upload" />
          <Stat label="Mode" value={effectiveConnected.length > 1 ? "Multi" : effectiveConnected[0] === "knot" ? "Testing" : effectiveConnected[0] === "blossom" ? "Primary" : "Down"} icon="bolt" accent="text-secondary" />
          <Stat
            label="Reliability"
            value={`${Math.round((effectiveConnected.length / Math.max(connected.length, 1)) * 100)}%`}
            icon="health_and_safety"
            accent="text-tertiary"
          />
        </div>

        <div>
          <h3 className="font-h2 text-h2 mb-2">Media Servers</h3>
          <p className="text-on-surface-variant text-body-md mb-2">
            Connect to more than one — uploads go out to every connected server at once.
          </p>
          <div className="flex flex-col gap-2">
            {SERVERS.map((s) => (
              <ServerRow
                key={s.value}
                server={s}
                active={connected.includes(s.value)}
                reachable={reachable[s.value]}
                onToggle={() => toggle(s.value)}
                onRemove={s.custom ? () => removeServer(s.value) : null}
              />
            ))}
          </div>
        </div>

        {/* Add a custom Blossom (BUD-01) server — same pattern as Relay Mesh's "Add a relay" */}
        <form onSubmit={addServer} className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter flex flex-col gap-2">
          <h3 className="font-bold text-on-surface">Add a media server</h3>
          <p className="text-on-surface-variant text-mono-label">Must speak the Blossom (BUD-01) upload protocol.</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (optional)"
              className="w-32 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:border-primary"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://blossom.example.com"
              className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:border-primary"
            />
            <button className="bg-primary text-on-primary px-4 rounded-lg font-bold text-label-sm">Add</button>
          </div>
        </form>
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

function ServerRow({ server, active, reachable, onToggle, onRemove }) {
  // Down = toggled on but the health check failed — the red-flag case.
  const down = active && reachable === false;
  const checking = active && reachable === undefined;
  const dotColor = down ? "bg-error animate-pulse" : active ? "bg-tertiary" : "bg-error";

  return (
    <div className={`bg-surface-container-low border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${down ? "border-error/60" : "border-outline-variant"}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface truncate">{server.name}</span>
            {server.value === "blossom" && (
              <span className="text-mono-label text-tertiary-fixed border border-outline-variant rounded px-1 shrink-0">DEFAULT</span>
            )}
            {down && (
              <span className="flex items-center gap-1 text-mono-label text-error border border-error/50 rounded px-1 shrink-0">
                <Icon name="flag" size={12} fill /> UNREACHABLE
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-mono-label truncate">{server.url}</p>
          <p className={`text-body-md mt-0.5 ${down ? "text-error" : "text-on-surface-variant"}`}>
            {down ? "Connected but not responding — uploads to this server will fail." : checking ? "Checking…" : server.desc}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
        <button
          onClick={onToggle}
          className={`border px-4 py-1.5 rounded-full font-bold text-label-sm transition-colors ${
            active
              ? "border-outline text-on-surface hover:bg-surface-container-high"
              : "border-primary text-primary hover:bg-primary/10"
          }`}
        >
          {active ? "Disconnect" : "Connect"}
        </button>
        {onRemove && (
          <button onClick={onRemove} title="Remove server" className="text-on-surface-variant hover:text-error">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
