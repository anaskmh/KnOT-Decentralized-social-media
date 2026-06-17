// ─────────────────────────────────────────────
// ZapModal — send a Lightning zap (NIP-57)
// ─────────────────────────────────────────────
// Pick an amount → fetch a real invoice. Then:
//   • wallet connected (NWC)  → pay it in one click, receipt follows
//   • no wallet               → show the invoice to pay manually
import { useState } from "react";

import Icon from "./ui/Icon";
import Avatar from "./ui/Avatar";
import DisplayName from "./ui/DisplayName";
import { useNostr, useProfile } from "../context/NostrContext";
import { useWallet } from "../context/WalletContext";
import { fetchZapEndpoint, requestZapInvoice } from "../nostr/zap";

const PRESETS = [21, 100, 500, 1000, 5000, 21000];

export default function ZapModal({ note, onClose }) {
  const { identity } = useNostr();
  const { connected, payInvoice } = useWallet();
  const profile = useProfile(note?.pubkey);
  const [sats, setSats] = useState(100);
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState("");
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!note) return null;

  const zap = async () => {
    const amount = parseInt(sats, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount of sats.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Steps 1-6: lud16 → LNURL endpoint → zap request (9734) → invoice.
      const endpoint = await fetchZapEndpoint(profile);
      const { pr, zapRequest } = await requestZapInvoice({
        endpoint,
        privHex: identity.privHex,
        recipientPubHex: note.pubkey,
        eventId: note.id,
        sats: amount,
        comment,
      });

      if (connected) {
        // Steps 7-9: the connected NWC wallet pays the invoice and the
        // zap receipt (9735) lands on the relays → the ⚡ count updates.
        await payInvoice(pr, zapRequest);
        setPaid(true);
      } else {
        // No wallet connected → hand the invoice over for manual payment.
        setInvoice(pr);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
          <span className="font-bold text-on-surface flex items-center gap-1">
            <Icon name="bolt" fill className="text-zap-yellow" size={20} /> Zap
          </span>
          <span className="w-6" />
        </div>

        <div className="p-gutter">
          <div className="flex items-center gap-3 mb-4">
            <Avatar pubkey={note.pubkey} size={40} />
            <DisplayName pubkey={note.pubkey} className="font-bold text-on-surface" />
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Icon name="bolt" fill className="text-zap-yellow" size={48} />
              <p className="font-bold text-on-surface">Zap sent — {sats.toLocaleString()} sats ⚡</p>
              <p className="text-on-surface-variant text-label-sm">Paid with your connected wallet.</p>
              <button onClick={onClose} className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold text-label-sm">
                Done
              </button>
            </div>
          ) : invoice ? (
            <div className="flex flex-col gap-3">
              <p className="text-tertiary text-body-md flex items-center gap-1">
                <Icon name="check_circle" fill size={18} /> Invoice ready — pay it with your Lightning wallet.
              </p>
              <textarea
                readOnly
                value={invoice}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 font-mono-label text-mono-label break-all h-24"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(invoice)}
                  className="flex-1 bg-surface-container-high text-on-surface py-2 rounded-full font-bold text-label-sm"
                >
                  Copy invoice
                </button>
                <a
                  href={`lightning:${invoice}`}
                  className="flex-1 text-center bg-primary text-on-primary py-2 rounded-full font-bold text-label-sm"
                >
                  Open wallet
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setSats(amount)}
                    className={`py-2 rounded-lg font-bold text-label-sm border transition-colors ${sats === amount
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary"
                      }`}
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative mb-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sats || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSats(isNaN(val) ? "" : val);
                  }}
                  placeholder="Custom amount"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 pr-14 text-body-md focus:outline-none focus:border-primary font-bold text-on-surface"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-label-sm pointer-events-none">
                  sats
                </span>
              </div>

              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment (optional)"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 mb-3 text-body-md focus:outline-none focus:border-primary"
              />
              {error && <p className="text-error text-label-sm mb-3">{error}</p>}
              <button
                onClick={zap}
                disabled={loading || !sats || sats <= 0}
                className="w-full bg-zap-yellow text-black py-2.5 rounded-full font-bold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
              >
                <Icon name="bolt" fill size={20} />
                {loading
                  ? connected ? "Zapping…" : "Requesting invoice…"
                  : `Zap ${sats ? sats.toLocaleString() : "custom"} sats${connected ? " · connected wallet" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
