// Pay a Lightning invoice (NWC pay_invoice).
import { useState } from "react";

import Icon from "../ui/Icon";
import { useWallet } from "../../context/WalletContext";

export default function SendModal({ onClose }) {
  const { payInvoice } = useWallet();
  const [invoice, setInvoice] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setLoading(true);
    setError("");
    try {
      await payInvoice(invoice.trim());
      setDone(true);
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
          <span className="font-bold flex items-center gap-1">
            <Icon name="north_east" className="text-primary" size={18} /> Send
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
          ) : (
            <>
              <p className="text-on-surface-variant text-body-md mb-3">Paste a Lightning invoice (bolt11) to pay.</p>
              <textarea
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                placeholder="lnbc…"
                className="w-full h-28 bg-surface-container-lowest border border-outline-variant rounded-lg p-3 font-mono-label text-mono-label break-all focus:outline-none focus:border-primary mb-3"
              />
              {error && <p className="text-error text-label-sm mb-3">{error}</p>}
              <button
                onClick={pay}
                disabled={loading || !invoice.trim()}
                className="w-full bg-primary text-on-primary py-2.5 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Paying…" : "Pay invoice"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
