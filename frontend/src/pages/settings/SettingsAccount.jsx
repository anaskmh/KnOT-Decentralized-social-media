import { useState } from "react";
import Header from "../../components/ui/Header";
import Icon from "../../components/ui/Icon";
import Avatar from "../../components/ui/Avatar";
import { useNostr } from "../../context/NostrContext";
import { toNpub } from "../../nostr/format";

export default function SettingsAccount() {
  const { identity } = useNostr();
  const [showPriv, setShowPriv] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const [copiedPriv, setCopiedPriv] = useState(false);

  const npub = identity ? toNpub(identity.pubHex) : "";
  const nsec = identity?.nsec ?? "";

  const copy = async (text, setCopied) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Header title="Account" />
      <div className="flex flex-col gap-6 p-4">

        {/* Security notice */}
        <div className="flex gap-3 p-4 border border-outline-variant rounded-xl text-on-surface-variant text-body-md">
          <Icon name="info" size={22} className="shrink-0 mt-0.5" />
          <p>
            Improve your account security by installing a Nostr browser extension like{" "}
            <span className="text-primary font-bold">Alby</span>. It stores your private key safely
            and signs into any Nostr app without exposing it.
          </p>
        </div>

        {/* Public key */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-mono-label uppercase tracking-widest text-xs text-on-surface-variant">Your Public Key</p>
            <button onClick={() => copy(npub, setCopiedPub)} className="text-primary text-label-sm font-bold flex items-center gap-1 hover:opacity-80">
              <Icon name={copiedPub ? "check" : "content_copy"} size={16} />
              {copiedPub ? "Copied!" : "Copy public key"}
            </button>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3">
            <Avatar pubkey={identity?.pubHex} size={36} />
            <p className="text-body-md text-on-surface break-all">{npub}</p>
          </div>
          <p className="text-mono-label text-on-surface-variant text-xs">Anyone on Nostr can find you via your public key. Safe to share.</p>
        </div>

        {/* Private key */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-mono-label uppercase tracking-widest text-xs text-on-surface-variant">Your Private Key</p>
            <button onClick={() => copy(nsec, setCopiedPriv)} className="text-primary text-label-sm font-bold flex items-center gap-1 hover:opacity-80">
              <Icon name={copiedPriv ? "check" : "content_copy"} size={16} />
              {copiedPriv ? "Copied!" : "Copy private key"}
            </button>
          </div>
          <div
            onClick={() => setShowPriv((v) => !v)}
            className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 cursor-pointer"
          >
            <Icon name={showPriv ? "key" : "lock"} size={22} className="text-on-surface-variant shrink-0" />
            <p className="text-body-md text-on-surface break-all font-mono flex-1">
              {showPriv ? nsec : "•".repeat(52)}
            </p>
            <Icon name={showPriv ? "visibility_off" : "visibility"} size={18} className="text-on-surface-variant shrink-0" />
          </div>
          <p className="text-mono-label text-error text-xs">
            ⚠️ Never share your private key. It gives full control of your Nostr account.
          </p>
        </div>

      </div>
    </>
  );
}
