// Paste a Nostr Wallet Connect string to link a wallet.
import { useState } from "react";

import Icon from "../ui/Icon";
import { useWallet } from "../../context/WalletContext";

export default function ConnectWalletModal({ onClose }) {
  const { connect } = useWallet();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    try {
      setError("");
      connect(value.trim());
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
          <span className="font-bold">Connect wallet</span>
          <span className="w-6" />
        </div>
        <div className="p-gutter flex flex-col gap-3">
          <p className="text-on-surface-variant text-body-md">
            Paste a Nostr Wallet Connect string from a compatible Lightning wallet
            (e.g. Alby, Mutiny, or Rizful).
          </p>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="nostr+walletconnect://…?relay=…&secret=…"
            className="w-full h-28 bg-surface-container-lowest border border-outline-variant rounded-lg p-3 font-mono-label text-mono-label break-all focus:outline-none focus:border-primary"
          />
          {error && <p className="text-error text-label-sm">{error}</p>}
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="w-full py-3 bg-on-surface text-background font-bold rounded-full active:scale-95 transition-all disabled:opacity-40"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
