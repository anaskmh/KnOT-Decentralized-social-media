// ─────────────────────────────────────────────
// Relay connection (WebSocket)
// ─────────────────────────────────────────────
// A tiny wrapper around one relay's WebSocket, speaking the same NIP-01
// messages as the Python relay in backend/relay/server.py:
//
//   send  ["EVENT", event]              → publish
//   send  ["REQ", subId, filter]        → subscribe
//   recv  ["EVENT", subId, event]       → a matching note
//   recv  ["EOSE", subId]               → end of stored events
//   recv  ["OK", id, accepted, msg]     → publish result
//
// It auto-reconnects so the feed survives the relay restarting.

const getLocalRelayUrl = () => {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/relay`;
  }
  return "ws://127.0.0.1:8765";
};

export const DEFAULT_RELAY = getLocalRelayUrl();

export class Relay {
  constructor(url = DEFAULT_RELAY) {
    this.url = url;
    this.ws = null;
    this.subscriptions = {};   // subId -> { onEvent, onEose }
    this.onStatusChange = () => {};
    this.connected = false;
    this.closed = false;       // set true to stop auto-reconnect
  }

  connect() {
    if (this.closed) return;
    // Already connecting or connected? Don't open a second socket (React
    // StrictMode runs effects twice, which would otherwise race here).
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      this.onStatusChange("connected");
      // Re-open every active subscription after a reconnect.
      for (const [subId, sub] of Object.entries(this.subscriptions)) {
        this._sendReq(subId, sub.filter);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.onStatusChange("disconnected");
      // Try again shortly, unless we were deliberately closed.
      if (!this.closed) setTimeout(() => this.connect(), 2000);
    };

    this.ws.onmessage = (raw) => {
      const message = JSON.parse(raw.data);
      const [type, subId, payload] = message;

      if (type === "EVENT") {
        this.subscriptions[subId]?.onEvent(payload);
      } else if (type === "EOSE") {
        this.subscriptions[subId]?.onEose?.();
      }
    };
  }

  // Subscribe with a filter. Returns an unsubscribe function.
  subscribe(filter, onEvent, onEose) {
    const subId = Math.random().toString(36).slice(2, 10);
    this.subscriptions[subId] = { filter, onEvent, onEose };
    if (this.connected) this._sendReq(subId, filter);

    return () => {
      this._send(["CLOSE", subId]);
      delete this.subscriptions[subId];
    };
  }

  // Publish a signed event.
  publish(event) {
    this._send(["EVENT", event]);
  }

  _sendReq(subId, filter) {
    this._send(["REQ", subId, filter]);
  }

  _send(message) {
    // readyState is the source of truth — `connected` can briefly disagree
    // with a freshly swapped socket during reconnects.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Close permanently (no reconnect).
  close() {
    this.closed = true;
    try {
      this.ws && this.ws.close();
    } catch {
      /* ignore */
    }
  }
}


// ─────────────────────────────────────────────
// The 4 relays KnOT connects to
// ─────────────────────────────────────────────
// One local relay (our Python backend) plus three big public ones.
// Connecting to several relays is how Nostr stays decentralized: your
// note is copied to all of them, so no single relay can hide or lose it.

export const DEFAULT_RELAYS = [
  { name: "KnOT",    url: DEFAULT_RELAY },   // our own Python relay (proxied dynamically)
  { name: "Damus",   url: "wss://relay.damus.io" },
  { name: "Primal",  url: "wss://relay.primal.net" },
  { name: "nos.lol", url: "wss://nos.lol" },
];


// ─────────────────────────────────────────────
// RelayPool — talk to many relays at once
// ─────────────────────────────────────────────
// Wraps several Relay connections behind the SAME publish()/subscribe()
// interface a single Relay has, so the rest of the app doesn't change.
//
//   publish(event)   → sends the note to EVERY relay
//   subscribe(...)   → asks EVERY relay, then merges their events and
//                      drops duplicates (the same note comes back from
//                      more than one relay).

export class RelayPool {
  constructor(relayConfigs = DEFAULT_RELAYS) {
    // Each entry keeps its own Relay connection + current status.
    this.entries = relayConfigs.map((config) => ({
      name: config.name,
      url: config.url,
      relay: new Relay(config.url),
      status: "connecting",
    }));
    this.onStatusChange = () => {};
  }

  connect() {
    for (const entry of this.entries) {
      entry.relay.onStatusChange = (status) => {
        entry.status = status;
        this.onStatusChange(this.statuses());
      };
      entry.relay.connect();
    }
  }

  // A snapshot of every relay's name/url/status for the UI.
  statuses() {
    return this.entries.map((e) => ({ name: e.name, url: e.url, status: e.status }));
  }

  // Subscribe on all relays and merge the results, ignoring duplicates.
  subscribe(filter, onEvent, onEose) {
    const seen = new Set();      // event ids we've already passed on
    let eoseCount = 0;
    let eoseFired = false;
    const totalRelays = this.entries.length;

    // Fire onEose once ALL connected relays have sent EOSE, or after a
    // 3-second safety timeout from the first EOSE — whichever comes first.
    // This prevents a fast relay with zero results from closing the pool
    // before slower relays finish sending their stored events.
    let eoseTimer = null;
    const fireEose = () => {
      if (eoseFired) return;
      eoseFired = true;
      clearTimeout(eoseTimer);
      onEose?.();
    };

    const unsubscribes = this.entries.map((entry) =>
      entry.relay.subscribe(
        filter,
        (event) => {
          if (seen.has(event.id)) return;   // already got it from another relay
          seen.add(event.id);
          onEvent(event);
        },
        () => {
          eoseCount += 1;
          // Start the safety timeout on the first EOSE so we don't wait forever.
          if (eoseCount === 1) {
            eoseTimer = setTimeout(fireEose, 3000);
          }
          // Fire immediately once every relay has checked in.
          if (eoseCount >= totalRelays) fireEose();
        },
      ),
    );

    // Unsubscribe = close the subscription on every relay.
    return () => {
      clearTimeout(eoseTimer);
      unsubscribes.forEach((unsub) => unsub());
    };
  }

  // Publish the signed note to every relay.
  publish(event) {
    for (const entry of this.entries) {
      entry.relay.publish(event);
    }
  }

  // Add a relay to the pool at runtime and connect it.
  addRelay(name, url) {
    if (this.entries.some((e) => e.url === url)) return;
    const entry = { name, url, relay: new Relay(url), status: "connecting" };
    entry.relay.onStatusChange = (status) => {
      entry.status = status;
      this.onStatusChange(this.statuses());
    };
    this.entries.push(entry);
    entry.relay.connect();
    this.onStatusChange(this.statuses());
  }

  // Remove a relay from the pool and close its socket.
  removeRelay(url) {
    const entry = this.entries.find((e) => e.url === url);
    if (!entry) return;
    try {
      entry.relay.close();
    } catch {
      /* ignore */
    }
    this.entries = this.entries.filter((e) => e.url !== url);
    this.onStatusChange(this.statuses());
  }
}


// ─────────────────────────────────────────────
// Measure a relay's latency (round-trip to connect)
// ─────────────────────────────────────────────
// Opens a throwaway WebSocket and times how long until it's open. Returns
// milliseconds, or null if it failed/timed out.
export function pingRelay(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = performance.now();
    let ws;
    const done = (value) => {
      try {
        ws && ws.close();
      } catch {
        /* ignore */
      }
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        clearTimeout(timer);
        done(Math.round(performance.now() - start));
      };
      ws.onerror = () => {
        clearTimeout(timer);
        done(null);
      };
    } catch {
      clearTimeout(timer);
      done(null);
    }
  });
}
