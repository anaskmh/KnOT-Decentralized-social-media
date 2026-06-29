// ─────────────────────────────────────────────
// Wallet — "Wallet Sovereignty" (NIP-47 Nostr Wallet Connect)
// ─────────────────────────────────────────────
// Connected → live balance, Receive/Send, real transaction history.
// Not connected → the "Connect Your Wallet" onboarding from the design.
import { useEffect, useState } from "react";

import Header from "../components/ui/Header";
import Icon from "../components/ui/Icon";
import { useWallet } from "../context/WalletContext";

import ConnectWalletModal from "../components/wallet/ConnectWalletModal";
import ReceiveModal from "../components/wallet/ReceiveModal";
import SendModal from "../components/wallet/SendModal";
import { timeAgo } from "../nostr/format";

export default function Wallet() {
  const { connected, balanceSats, transactions, disconnect, error, markWalletRead } = useWallet();
  const [modal, setModal] = useState(null); // "connect" | "receive" | "send"
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeTx, setActiveTx] = useState(null);

  // Clear the wallet nav badge as soon as the user opens this page.
  useEffect(() => {
    markWalletRead();
  }, [markWalletRead]);

  // 1 sat = 0.00000001 BTC — needs all 8 decimals or small balances round to 0.
  const btc = balanceSats == null ? "0.00000000" : (balanceSats / 1e8).toFixed(8);

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
        <div className="font-h1 text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight mb-1 whitespace-nowrap">{btc} BTC</div>
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
        <RecentActivity transactions={transactions} onSelect={setActiveTx} />
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
      {activeTx && <TxDetailModal tx={activeTx} onClose={() => setActiveTx(null)} />}
    </>
  );
}

// ── Recent activity list ────────────────────────────────────────
function RecentActivity({ transactions, onSelect }) {
  const items = transactions.filter((t) => t.description !== "Starting balance");

  // A self-zap is a Sent and a Received that share the same invoice. They can
  // settle a second apart, so sorting on raw time alone would split them or
  // flip their order. Instead we give both halves of a pair the SAME sort time
  // (the later of the two) so they always stay adjacent, then force Received
  // above Sent — exactly how Rizful lists a self-zap.
  const pairTime = new Map(); // invoice -> latest settle/created time across its txs
  for (const t of items) {
    if (!t.invoice) continue;
    const tt = t.settled_at || t.created_at || 0;
    pairTime.set(t.invoice, Math.max(pairTime.get(t.invoice) || 0, tt));
  }
  const sortTime = (t) =>
    t.invoice && pairTime.has(t.invoice) ? pairTime.get(t.invoice) : t.settled_at || t.created_at || 0;
  const rank = (t) => (t.type === "incoming" ? 0 : 1); // Received above Sent

  const ordered = items.slice().sort((a, b) => {
    const ta = sortTime(a);
    const tb = sortTime(b);
    if (tb !== ta) return tb - ta; // newest first
    return rank(a) - rank(b);
  });
  return (
    <section className="border-t border-outline-variant">
      <div className="p-edge-margin font-h2 text-h2">Recent Activity</div>
      {ordered.length === 0 ? (
        <p className="px-edge-margin pb-6 text-on-surface-variant text-body-md">
          No transactions yet. Use Receive or Send to get started.
        </p>
      ) : (
        ordered.map((tx, i) => <TxRow key={i} tx={tx} onSelect={onSelect} />)
      )}
    </section>
  );
}

function TxRow({ tx, onSelect }) {
  const incoming = tx.type === "incoming";
  const sats = Math.floor(tx.amount / 1000);

  // NIP-47's list_transactions reports settlement via `state`/`settled_at`,
  // not a `settled` boolean — a tx is settled once either is present.
  const isSettled = tx.state === "settled" || Boolean(tx.settled_at) || Boolean(tx.preimage);
  const nowSec = Math.floor(Date.now() / 1000);
  const showPending = !isSettled && (nowSec - tx.created_at) < 600;

  // Truncated invoice, e.g. "lnbc210n1p...mlxy46".
  const truncatedInvoice = tx.invoice && tx.invoice.length > 19
    ? `${tx.invoice.slice(0, 10)}...${tx.invoice.slice(-6)}`
    : tx.invoice;

  return (
    <button
      onClick={() => onSelect(tx)}
      className="w-full px-edge-margin py-3 border-b border-outline-variant flex items-center justify-between hover:bg-surface-container-low transition-colors gap-3 text-left"
    >
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        incoming ? "bg-tertiary/10" : "bg-error-container/20"
      }`}>
        <Icon
          name={incoming ? "south_west" : "north_east"}
          className={incoming ? "text-tertiary" : "text-error"}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-on-surface">{incoming ? "Received" : "Sent"}</span>
          {showPending && (
            <span className="text-zap-yellow text-xs border border-zap-yellow/50 rounded px-1.5 py-0.5 shrink-0">
              pending
            </span>
          )}
        </div>
        {truncatedInvoice && (
          <p className="font-mono text-on-surface-variant text-xs truncate">{truncatedInvoice}</p>
        )}
        <p className="text-on-surface-variant text-xs">{timeAgo(tx.created_at)}</p>
      </div>

      {/* Amount — green for incoming, red for outgoing */}
      <div className={`font-mono-label font-bold shrink-0 text-base ${
        incoming ? "text-tertiary" : "text-error"
      }`}>
        {incoming ? "+" : "-"}{sats.toLocaleString()} sats
      </div>
    </button>
  );
}

// ── Transaction detail modal ──────────────────────────────────────
function TxDetailModal({ tx, onClose }) {
  const [copiedField, setCopiedField] = useState(null); // "hash" | "invoice"
  const incoming = tx.type === "incoming";
  const sats = Math.floor(tx.amount / 1000);
  const isSettled = tx.state === "settled" || Boolean(tx.settled_at) || Boolean(tx.preimage);
  const nowSec = Math.floor(Date.now() / 1000);
  const isPending = !isSettled && (nowSec - tx.created_at) < 600;
  const status = tx.state === "failed" ? "Failed" : isPending ? "Pending" : "Succeeded";
  const statusColor = status === "Failed" ? "text-error bg-error-container/20" : status === "Pending" ? "text-zap-yellow bg-zap-yellow/10" : "text-tertiary bg-tertiary/10";

  const truncatedInvoice = tx.invoice && tx.invoice.length > 22
    ? `${tx.invoice.slice(0, 12)}...${tx.invoice.slice(-6)}`
    : tx.invoice;

  const date = new Date(tx.created_at * 1000).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const copy = (field, value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-4 pt-3">
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col items-center text-center gap-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${incoming ? "bg-tertiary/10" : "bg-error-container/20"}`}>
            <Icon name={incoming ? "south_west" : "north_east"} className={incoming ? "text-tertiary" : "text-error"} size={28} />
          </div>
          <h2 className="font-h2 text-h2 text-on-surface">{incoming ? "Payment Received" : "Payment Sent"}</h2>
          {truncatedInvoice && (
            <div className="flex items-center gap-1.5 max-w-full">
              <p className="font-mono text-xs text-on-surface-variant truncate">{truncatedInvoice}</p>
              <button
                onClick={() => copy("invoice", tx.invoice)}
                className="text-on-surface-variant hover:text-primary shrink-0"
                title="Copy invoice"
              >
                <Icon name={copiedField === "invoice" ? "check" : "content_copy"} size={14} className={copiedField === "invoice" ? "text-tertiary" : ""} />
              </button>
            </div>
          )}
          <div className={`font-mono-label font-bold text-3xl ${incoming ? "text-tertiary" : "text-error"}`}>
            {incoming ? "+" : "-"}{sats.toLocaleString()} <span className="text-lg">sats</span>
          </div>
          <p className="text-on-surface-variant text-body-md">{date}</p>
          <span className={`text-label-sm font-bold px-3 py-1 rounded-full ${statusColor}`}>{status}</span>
        </div>

        {tx.payment_hash && (
          <div className="px-4 pb-4">
            <div className="bg-surface-container-high rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-on-surface-variant text-label-sm mb-1">Payment hash</p>
                <p className="font-mono text-xs text-on-surface break-all">{tx.payment_hash}</p>
              </div>
              <button onClick={() => copy("hash", tx.payment_hash)} className="text-on-surface-variant hover:text-primary shrink-0">
                <Icon name={copiedField === "hash" ? "check" : "content_copy"} size={16} className={copiedField === "hash" ? "text-tertiary" : ""} />
              </button>
            </div>
          </div>
        )}
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
