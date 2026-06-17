// ─────────────────────────────────────────────
// Nostr Wallet Connect client (NIP-47)
// ─────────────────────────────────────────────
// The "app" side of NWC. We connect to the wallet's relay, send encrypted
// kind-23194 requests to the wallet's pubkey, and read the encrypted
// kind-23195 responses. The wallet (Alby, Mutiny, Rizful, …) holds the funds
// and answers; KnOT never stores a balance or ledger of its own.

import { Relay } from "./relay";
import { finalizeEvent } from "nostr-tools/pure";
import { encrypt, decrypt } from "nostr-tools/nip04";
import { hexToBytes } from "nostr-tools/utils";

const REQUEST_KIND = 23194;
const RESPONSE_KIND = 23195;

// Parse "nostr+walletconnect://<pubkey>?relay=...&secret=..."
export function parseNwc(uri) {
  const cleaned = uri.trim().replace(/^nostr\+?walletconnect:\/\//i, "");
  const [walletPubkey, queryString = ""] = cleaned.split("?");
  const params = new URLSearchParams(queryString);
  const relay = params.get("relay");
  const secret = params.get("secret");
  if (!/^[0-9a-f]{64}$/i.test(walletPubkey) || !relay || !secret) {
    throw new Error("Invalid connection string.");
  }
  return { walletPubkey, relay, secret };
}

export class NWC {
  constructor(uri) {
    this.conn = parseNwc(uri);
    this.relay = new Relay(this.conn.relay);
    this.relay.connect();
  }

  close() {
    this.relay.close();
  }

  // Wait until the relay socket is open (NWC requests must actually send).
  async _waitConnected(timeoutMs = 8000) {
    const start = Date.now();
    while (!this.relay.connected) {
      if (Date.now() - start > timeoutMs) throw new Error("Could not reach the wallet relay.");
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Send one NIP-47 request and resolve with its decrypted result.
  async request(method, params = {}) {
    await this._waitConnected();
    const { walletPubkey, secret } = this.conn;
    const secretBytes = hexToBytes(secret);

    const content = await encrypt(secretBytes, walletPubkey, JSON.stringify({ method, params }));
    const reqEvent = finalizeEvent(
      {
        kind: REQUEST_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", walletPubkey]],
        content,
      },
      secretBytes,
    );

    return new Promise((resolve, reject) => {
      let settled = false;
      const unsubscribe = this.relay.subscribe(
        { kinds: [RESPONSE_KIND], "#e": [reqEvent.id] },
        async (event) => {
          if (settled) return;
          settled = true;
          unsubscribe();
          try {
            const json = JSON.parse(await decrypt(secretBytes, walletPubkey, event.content));
            if (json.error) reject(new Error(json.error.message || "Wallet error"));
            else resolve(json.result);
          } catch (e) {
            reject(e);
          }
        },
      );

      this.relay.publish(reqEvent);

      setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject(new Error("The wallet did not respond. Is the wallet service running?"));
      }, 12000);
    });
  }

  getBalance() {
    return this.request("get_balance"); // → { balance: msat }
  }
  makeInvoice(amountSats, description) {
    return this.request("make_invoice", { amount: amountSats * 1000, description });
  }
  // zapRequest is optional: when paying a zap, we pass the signed kind-9734
  // along so the wallet can publish the kind-9735 receipt afterwards.
  payInvoice(invoice, zapRequest = null) {
    const params = { invoice };
    if (zapRequest) params.zap_request = zapRequest;
    return this.request("pay_invoice", params); // → { preimage }
  }
  listTransactions() {
    return this.request("list_transactions", { limit: 20 }); // → { transactions: [...] }
  }
}
