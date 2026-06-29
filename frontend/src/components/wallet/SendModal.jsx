// Pay a Lightning invoice OR a Lightning address (NWC pay_invoice).
import { useState } from "react";

import Icon from "../ui/Icon";
import { useWallet } from "../../context/WalletContext";
import { fetchAddressInvoice } from "../../nostr/zap";
import { decodeInvoice } from "../../nostr/bolt11";

// A Lightning address looks like an email (name@domain.tld); an invoice
// starts with "lnbc"/"LNBC" — that's enough to tell the two apart here.
const isLightningAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const truncate = (s, head = 18, tail = 8) =>
  s && s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;

export default function SendModal({ onClose }) {
  const { payInvoice, balanceSats } = useWallet();
  const [input, setInput] = useState("");
  const [sats, setSats] = useState(1000);
  const [preview, setPreview] = useState(null); // { pr, decoded } once reviewed
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const target = input.trim();
  const isAddress = isLightningAddress(target);

  // Step 1: resolve (address → invoice, if needed) and decode it for review.
  const review = async () => {
    setLoading(true);
    setError("");
    try {
      const pr = isAddress ? await fetchAddressInvoice(target, sats) : target;
      const decoded = decodeInvoice(pr);
      if (!decoded) throw new Error("That doesn't look like a valid Lightning invoice.");
      setPreview({ pr, decoded });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: actually pay the reviewed invoice.
  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      await payInvoice(preview.pr);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setPreview(null);
    setError("");
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
          <button onClick={preview && !done ? back : onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name={preview && !done ? "arrow_back" : "close"} />
          </button>
          <span className="font-bold flex items-center gap-1">
            <Icon name="north_east" className="text-primary" size={18} /> {preview && !done ? "Sending To" : "Send"}
          </span>
          <span className="w-6" />
        </div>

        <div className="p-gutter">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Icon name="check_circle" fill className="text-tertiary" size={48} />
              <p className="font-bold text-on-surface">Payment sent</p>
              <button onClick={onClose} className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold text-label-sm">
                Done
              </button>
            </div>
          ) : preview ? (
            <InvoicePreview
              pr={preview.pr}
              decoded={preview.decoded}
              balanceSats={balanceSats}
              error={error}
              loading={loading}
              onConfirm={confirm}
            />
          ) : (
            <>
              <p className="text-on-surface-variant text-body-md mb-3">Paste a Lightning invoice (bolt11) or a Lightning address.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="lnbc… or name@domain.com"
                className="w-full h-28 bg-surface-container-lowest border border-outline-variant rounded-lg p-3 font-mono-label text-mono-label break-all focus:outline-none focus:border-primary mb-3"
              />
              {isAddress && (
                <input
                  type="number"
                  value={sats}
                  onChange={(e) => setSats(Number(e.target.value))}
                  placeholder="Amount in sats"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 mb-3 text-body-md focus:outline-none focus:border-primary"
                />
              )}
              {error && <p className="text-error text-label-sm mb-3">{error}</p>}
              <button
                onClick={review}
                disabled={loading || !target || (isAddress && sats <= 0)}
                className="w-full bg-primary text-on-primary py-2.5 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Looking up…" : "Review"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Decoded invoice preview, shown before the user confirms paying ──────
function InvoicePreview({ pr, decoded, balanceSats, error, loading, onConfirm }) {
  const { amountSats, paymentHash, description, expiresAt } = decoded;
  const insufficient = amountSats != null && balanceSats != null && amountSats > balanceSats;

  return (
    <div className="flex flex-col items-center text-center gap-1 py-2">
      <div className="w-20 h-20 rounded-full bg-secondary-container/20 border border-outline-variant flex items-center justify-center mb-3">
        <Icon name="bolt" fill className="text-secondary" size={36} />
      </div>
      <h3 className="font-h2 text-h2 text-on-surface">Lightning Invoice</h3>
      <p className="font-mono text-xs text-on-surface-variant break-all px-2">{truncate(pr)}</p>

      <div className="font-mono-label font-bold text-3xl text-on-surface mt-3">
        {amountSats == null ? "Any amount" : amountSats.toLocaleString()}{" "}
        {amountSats != null && <span className="text-lg">sats</span>}
      </div>
      <p className="text-on-surface-variant text-label-sm tracking-wide mb-3">BOLT11</p>

      <div className="w-full text-left text-body-md space-y-1.5">
        {description && (
          <p className="text-on-surface-variant">
            Description: <span className="text-on-surface">{description}</span>
          </p>
        )}
        {paymentHash && (
          <p className="text-on-surface-variant break-all">
            Payment hash: <span className="text-on-surface font-mono text-xs">{truncate(paymentHash)}</span>
          </p>
        )}
        {expiresAt && (
          <p className="text-on-surface-variant">
            Expiry:{" "}
            <span className="text-on-surface">
              {expiresAt.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
        )}
      </div>

      {balanceSats != null && (
        <p className={`w-full text-left mt-3 px-3 py-2 rounded-lg text-label-sm border ${
          insufficient ? "text-error border-error/40 bg-error-container/10" : "text-tertiary border-tertiary/30 bg-tertiary/10"
        }`}>
          Available balance: {balanceSats.toLocaleString()} sats.
        </p>
      )}

      {error && <p className="text-error text-label-sm mt-2">{error}</p>}

      <button
        onClick={onConfirm}
        disabled={loading || insufficient}
        className="w-full bg-primary text-on-primary py-2.5 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50 mt-4"
      >
        {loading ? "Paying…" : "Pay invoice"}
      </button>
    </div>
  );
}
