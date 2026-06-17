// ─────────────────────────────────────────────
// Wallet — "Wallet Sovereignty" (NIP-47 Nostr Wallet Connect)
// ─────────────────────────────────────────────
// Connected → live balance, Receive/Send, real transaction history.
// Not connected → the "Connect Your Wallet" onboarding from the design.
import { useState } from "react";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";
import { useWallet } from "../context/WalletContext";
import { useNostr, useProfile } from "../context/NostrContext";

import ConnectWalletModal from "../components/wallet/ConnectWalletModal";
import ReceiveModal from "../components/wallet/ReceiveModal";
import SendModal from "../components/wallet/SendModal";
import { timeAgo } from "../nostr/format";

export default function Wallet() {
  const { connected, balanceSats, transactions, disconnect, error } = useWallet();
  const [modal, setModal] = useState(null); // "connect" | "receive" | "send"
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const btc = balanceSats == null ? "0.000000" : (balanceSats / 1e8).toFixed(6);

  return (
    <>
      <Header
        title="Wallet Sovereignty"
        right={
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="p-2 hover:bg-surface-container-high rounded-full">
              <Icon name="settings" className="text-on-surface" />
            </button>
            {menuOpen && connected && (
              <div className="absolute right-0 mt-1 bg-surface-container-high border border-outline-variant rounded-lg overflow-hidden z-50">
                <button
                  onClick={() => { disconnect(); setMenuOpen(false); }}
                  className="px-4 py-2 text-error hover:bg-surface-container-highest whitespace-nowrap text-label-sm font-bold"
                >
                  Disconnect wallet
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Balance hero */}
      <section className="p-8 flex flex-col items-center justify-center text-center border-b border-outline-variant">
        <div className="w-20 h-20 bg-secondary-container/20 rounded-full flex items-center justify-center mb-6 border border-outline-variant">
          <Icon name="bolt" fill className="text-secondary" size={40} />
        </div>
        <div className="font-mono-label text-on-surface-variant mb-2">Total Balance</div>
        <div className="font-h1 text-4xl font-extrabold text-on-surface tracking-tight mb-1">{btc} BTC</div>
        <div className="font-h2 text-primary">
          {balanceSats == null ? "—" : balanceSats.toLocaleString()} Sats
        </div>
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setModal(connected ? "receive" : "connect")}
            className="px-6 py-2 bg-on-surface text-background font-bold rounded-full hover:bg-surface-bright transition-colors"
          >
            Receive
          </button>
          <button
            onClick={() => setModal(connected ? "send" : "connect")}
            className="px-6 py-2 border border-outline-variant text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-colors"
          >
            Send
          </button>
        </div>
        {error && connected && <p className="text-error text-label-sm mt-3">{error}</p>}
      </section>

      {/* Connected → activity. Not connected → onboarding. */}
      {connected ? (
        <RecentActivity transactions={transactions} />
      ) : dismissed ? (
        <div className="p-10 flex flex-col items-center text-on-surface-variant opacity-40 gap-3">
          <Icon name="account_balance_wallet" size={40} />
          <p className="text-body-md">No wallet connected.</p>
          <button onClick={() => setModal("connect")} className="text-primary font-bold">Connect one</button>
        </div>
      ) : (
        <ConnectOnboarding onConnect={() => setModal("connect")} onDismiss={() => setDismissed(true)} />
      )}

      {modal === "connect" && <ConnectWalletModal onClose={() => setModal(null)} />}
      {modal === "receive" && <ReceiveModal onClose={() => setModal(null)} />}
      {modal === "send" && <SendModal onClose={() => setModal(null)} />}
    </>
  );
}

// ── Recent activity list ────────────────────────────────────────
function RecentActivity({ transactions }) {
  const items = transactions.filter((t) => t.description !== "Starting balance");
  return (
    <section className="border-t border-outline-variant">
      <div className="p-edge-margin font-h2 text-h2">Recent Activity</div>
      {items.length === 0 ? (
        <p className="px-edge-margin pb-6 text-on-surface-variant text-body-md">
          No transactions yet. Use Receive or Send to get started.
        </p>
      ) : (
        items.map((tx, i) => <TxRow key={i} tx={tx} />)
      )}
    </section>
  );
}

function TxRow({ tx }) {
  const { identity } = useNostr();
  const incoming = tx.type === "incoming";
  const sats = Math.floor(tx.amount / 1000);

  // If we have a counterparty pubkey (e.g. sender for incoming, recipient for outgoing),
  // show their profile. Otherwise fall back to user's own profile for outgoing generic payments.
  const counterpartyPubkey = tx.counterparty_pubkey || "";
  const avatarPubkey = counterpartyPubkey || (incoming ? "" : (identity?.pubHex || ""));

  // Fetch the profile for whoever we're displaying.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const profile = useProfile(avatarPubkey);

  // Resolve a human-readable name.
  const displayName = profile?.display_name || profile?.name ||
    (counterpartyPubkey
      ? "Nostr User"
      : (incoming ? "Unknown sender" : (identity ? "You" : "Me")));

  // Show "pending" only when the tx is both genuinely unsettled AND recent.
  // The wallet service auto-settles after 5s, so anything older than 10 minutes
  // that still shows unsettled is stale data (service was killed mid-flight).
  const nowSec = Math.floor(Date.now() / 1000);
  const showPending = !tx.settled && (nowSec - tx.created_at) < 600;

  const preposition = incoming ? "from" : (counterpartyPubkey ? "to" : "by");

  // Format invoice to a truncated style (e.g. lnbc10dhdhsn4.....am62cd) if present
  const truncatedInvoice = tx.invoice && tx.invoice.length > 22
    ? `${tx.invoice.slice(0, 12)}.....${tx.invoice.slice(-6)}`
    : tx.invoice;

  return (
    <div className="px-edge-margin py-3 border-b border-outline-variant flex items-center justify-between hover:bg-surface-container-low transition-colors gap-3">
      {/* Avatar — show profile pic or fallback icon */}
      <div className="shrink-0">
        {avatarPubkey ? (
          <Avatar pubkey={avatarPubkey} size={40} />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            incoming ? "bg-tertiary/10" : "bg-error-container/20"
          }`}>
            <Icon
              name={incoming ? "bolt" : "receipt_long"}
              className={incoming ? "text-tertiary" : "text-error"}
            />
          </div>
        )}
      </div>

      {/* Label + sender/recipient name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-on-surface">
            {incoming ? "Payment received" : "Invoice paid"}
          </span>
          <span className="text-on-surface-variant text-xs shrink-0">· {timeAgo(tx.created_at)}</span>
          {showPending && (
            <span className="text-zap-yellow text-xs border border-zap-yellow/50 rounded px-1.5 py-0.5 ml-1 shrink-0">
              pending
            </span>
          )}
        </div>
        {/* Who sent / received */}
        <p className="text-on-surface-variant text-sm truncate">
          {preposition} <span className="text-on-surface font-medium">{displayName}</span>
        </p>
        {/* Optional description and invoice badge */}
        {(tx.description || truncatedInvoice) && (
          <p className="text-on-surface-variant text-xs truncate mt-0.5 flex items-center gap-1.5">
            {tx.description && <span>{tx.description}</span>}
            {truncatedInvoice && (
              <span className="font-mono text-[10px] bg-surface-container-highest px-1.5 py-0.5 rounded text-on-surface-variant select-all">
                {truncatedInvoice}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Amount — green for incoming, red for outgoing */}
      <div className={`font-mono-label font-bold shrink-0 text-base ${
        incoming ? "text-tertiary" : "text-error"
      }`}>
        {incoming ? "+" : "-"}{sats.toLocaleString()} Sats
      </div>
    </div>
  );
}

// ── Connect onboarding (shown when no wallet is linked) ─────────
const BENEFITS = [
  { icon: "attach_money", bg: "bg-tertiary/10", fg: "text-tertiary", title: "Receive support instantly", body: "Let people zap your notes and profile with a real connected wallet." },
  { icon: "qr_code_scanner", bg: "bg-secondary/10", fg: "text-secondary", title: "Send and scan payments", body: "Pay invoices, scan payment QR codes, and use Lightning addresses in one flow." },
  { icon: "analytics", bg: "bg-primary/10", fg: "text-primary", title: "Track balance and history", body: "See your wallet balance, recent activity, and payment details in one place." },
];

function ConnectOnboarding({ onConnect, onDismiss }) {
  return (
    <section className="p-edge-margin space-y-8">
      <div className="text-center space-y-3">
        <h3 className="font-h1 text-h1 text-on-surface">Connect Your Wallet</h3>
        <p className="text-on-surface-variant font-body-lg">
          Unlock zaps, sending, receiving, and a focused wallet activity view across the app.
        </p>
      </div>

      <div className="space-y-6">
        <h4 className="font-h2 text-h2 text-on-surface">What you get</h4>
        <p className="text-on-surface-variant">
          A connected Lightning wallet becomes part of your profile and payment flow without storing funds in the app.
        </p>
        <div className="space-y-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4">
              <div className={`w-10 h-10 rounded-full ${b.bg} flex items-center justify-center shrink-0`}>
                <Icon name={b.icon} className={b.fg} />
              </div>
              <div>
                <h5 className="font-bold text-on-surface">{b.title}</h5>
                <p className="text-on-surface-variant text-sm">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border border-outline-variant p-6 rounded-xl bg-surface-container-lowest">
        <h4 className="font-h2 text-h2 text-on-surface">Setup takes a minute</h4>
        <p className="text-on-surface-variant">
          Choose a compatible wallet, generate a secure Nostr Wallet Connect link, and connect it once here.
        </p>
        <div className="space-y-4 mt-4">
          <Step n="01" title="Pick a compatible wallet" body="Use a Lightning wallet that supports Nostr Wallet Connect (Alby, Mutiny, Rizful…)." />
          <Step n="02" title="Link it and start using it" body="Once connected, the same wallet is available for zaps, sending, receiving, and history." />
        </div>
        <div className="flex flex-col gap-3 mt-8">
          <button onClick={onConnect} className="w-full py-4 bg-on-surface text-background font-bold rounded-full active:scale-95 transition-transform text-lg">
            Connect wallet
          </button>
          <button onClick={onDismiss} className="w-full py-4 border border-outline-variant text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="font-mono-label bg-surface-container-high px-2 py-1 rounded text-primary">{n}</div>
      <div>
        <h5 className="font-bold text-on-surface">{title}</h5>
        <p className="text-on-surface-variant text-sm">{body}</p>
      </div>
    </div>
  );
}
