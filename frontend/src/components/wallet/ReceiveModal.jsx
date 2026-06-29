// Create a Lightning invoice to receive sats (NWC make_invoice).
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import Icon from "../ui/Icon";
import { useWallet } from "../../context/WalletContext";

const PRESETS = [1000, 5000, 21000, 100000];

export default function ReceiveModal({ onClose }) {
  const { makeInvoice } = useWallet();
  const [sats, setSats] = useState(1000);
  const [description, setDescription] = useState("");
  const [invoice, setInvoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!invoice || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, invoice, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [invoice]);

  const create = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await makeInvoice(sats, description || "KnOT payment");
      setInvoice(result.invoice);
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
            <Icon name="south_west" className="text-tertiary" size={18} /> Receive
          </span>
          <span className="w-6" />
        </div>

        <div className="p-gutter">
          {invoice ? (
            <div className="flex flex-col gap-3">
              <p className="text-tertiary text-body-md flex items-center gap-1">
                <Icon name="check_circle" fill size={18} /> Invoice for {sats.toLocaleString()} sats created.
              </p>
              <div className="flex justify-center p-3 bg-white rounded-xl">
                <canvas ref={canvasRef} />
              </div>
              <textarea
                readOnly
                value={invoice}
                className="w-full h-24 bg-surface-container-lowest border border-outline-variant rounded-lg p-2 font-mono-label text-mono-label break-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(invoice)}
                  className="flex-1 bg-surface-container-high text-on-surface py-2 rounded-full font-bold text-label-sm"
                >
                  Copy invoice
                </button>
                <button onClick={onClose} className="flex-1 bg-primary text-on-primary py-2 rounded-full font-bold text-label-sm">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSats(amount)}
                    className={`py-2 rounded-lg font-bold text-label-sm border transition-colors ${
                      sats === amount ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {amount >= 1000 ? `${amount / 1000}k` : amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={sats}
                onChange={(e) => setSats(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 mb-2 text-body-md focus:outline-none focus:border-primary"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 mb-3 text-body-md focus:outline-none focus:border-primary"
              />
              {error && <p className="text-error text-label-sm mb-3">{error}</p>}
              <button
                onClick={create}
                disabled={loading || sats <= 0}
                className="w-full bg-tertiary text-on-tertiary py-2.5 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create invoice"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
