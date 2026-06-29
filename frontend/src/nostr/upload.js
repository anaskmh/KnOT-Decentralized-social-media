// ─────────────────────────────────────────────
// uploadMedia — send a file to every CONNECTED media server, like a relay
// pool: you can be hooked up to several at once, not just one.
// ─────────────────────────────────────────────
// Two built-in options, toggled on/off in Settings → Media Server:
//   "blossom"  blossom.primal.net (BUD-01) — the default, zero-maintenance
//   "knot"     our own media-s3-knot server — local, just for testing
// On top of those, the user can add any number of custom Blossom-protocol
// (BUD-01) servers — same as adding a custom relay in Relays.jsx. A custom
// server's "value" in the connected list is just its URL.
import { finalizeEvent } from "nostr-tools/pure";
import { hexToBytes, bytesToHex } from "nostr-tools/utils";

export const MEDIA_SERVER_KEY = "knot_media_servers";
export const CUSTOM_SERVERS_KEY = "knot_custom_media_servers";
export const BLOSSOM_URL = "https://blossom.primal.net";
export const KNOT_MEDIA_URL = "http://127.0.0.1:8766";

// Returns the array of currently-connected server values, e.g. ["blossom"]
// or ["blossom", "knot", "https://my-server.example.com"]. Falls back to
// just Blossom if nothing is saved yet.
export function loadMediaServers() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEDIA_SERVER_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* fall through to default */ }
  return ["blossom"];
}

export function saveMediaServers(values) {
  localStorage.setItem(MEDIA_SERVER_KEY, JSON.stringify(values));
}

// User-added Blossom servers, kept separate from the two built-in defaults
// — mirrors how Relays.jsx keeps added relays alongside the default pool.
export function loadCustomServers() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_SERVERS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch { /* fall through to empty */ }
  return [];
}

export function saveCustomServers(servers) {
  localStorage.setItem(CUSTOM_SERVERS_KEY, JSON.stringify(servers));
}

export function addCustomServer(name, url) {
  const servers = loadCustomServers();
  if (servers.some((s) => s.url === url)) return servers;
  const next = [...servers, { name: name || url.replace(/^https?:\/\//, ""), url }];
  saveCustomServers(next);
  return next;
}

export function removeCustomServer(url) {
  const next = loadCustomServers().filter((s) => s.url !== url);
  saveCustomServers(next);
  // Drop it from the connected list too, so it doesn't linger as a phantom node.
  saveMediaServers(loadMediaServers().filter((v) => v !== url));
  return next;
}

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest));
}

// BUD-01 auth event (kind 24242): proves to the Blossom server that we
// (the holder of this key) authorized this specific upload.
function buildBlossomAuth(privHex, hash) {
  const now = Math.floor(Date.now() / 1000);
  return finalizeEvent(
    {
      kind: 24242,
      created_at: now,
      tags: [
        ["t", "upload"],
        ["x", hash],
        ["expiration", String(now + 300)],
      ],
      content: "Upload media via KnOT",
    },
    hexToBytes(privHex),
  );
}

// Any BUD-01 (Blossom) server speaks the same PUT /upload protocol, so the
// built-in Blossom default and any user-added custom server share this path.
async function uploadToBlossom(file, privHex, baseUrl = BLOSSOM_URL) {
  const hash = await sha256Hex(file);
  const auth = buildBlossomAuth(privHex, hash);
  const authHeader = "Nostr " + btoa(JSON.stringify(auth));

  const res = await fetch(`${baseUrl}/upload`, {
    method: "PUT",
    headers: { Authorization: authHeader, "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload to ${baseUrl} failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

async function uploadToKnotServer(file) {
  const res = await fetch(`${KNOT_MEDIA_URL}/upload`, {
    method: "POST",
    headers: { "X-Filename": file.name },
    body: file,
  });
  if (!res.ok) throw new Error(`media-s3-knot upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

// Health check — is this server actually reachable right now? Used by the
// Settings page to show a red flag on a connected-but-down server, the same
// way the relay mesh shows a relay as offline when its socket drops.
// mode: "no-cors" lets us probe a cross-origin host without hitting a CORS
// error — any response (even an opaque one) means the server answered.
export async function pingMediaServer(value, timeoutMs = 4000) {
  const base = value === "knot" ? KNOT_MEDIA_URL : value === "blossom" ? BLOSSOM_URL : value;
  const url = `${base}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Upload `file` to every connected server in parallel (mirrors how the
// relay pool publishes a note to every connected relay at once). Returns
// the first URL to succeed; the rest keep going in the background so the
// file still ends up replicated even if we don't wait for them.
export async function uploadMedia(file, privHex) {
  const servers = loadMediaServers();
  const jobs = servers.map((server) => {
    if (server === "knot") return uploadToKnotServer(file);
    if (server === "blossom") return uploadToBlossom(file, privHex);
    return uploadToBlossom(file, privHex, server); // custom server — value IS its url
  });
  return Promise.any(jobs);
}
