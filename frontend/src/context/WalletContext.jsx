// ─────────────────────────────────────────────
// WalletContext — Nostr Wallet Connect state
// ─────────────────────────────────────────────
// Holds the NWC connection, the live balance and the transaction history.
// The connection string is saved in localStorage so the wallet stays linked
// across reloads. Balance is polled so simulated incoming payments show up.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { NWC } from "../nostr/nwc";

const STORAGE_KEY = "knot_nwc";
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [uri, setUri] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [balanceMsat, setBalanceMsat] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const nwcRef = useRef(null);

  const connected = Boolean(uri);

  // (Re)build the NWC client whenever the connection string changes.
  useEffect(() => {
    if (!uri) {
      nwcRef.current?.close();
      nwcRef.current = null;
      setBalanceMsat(null);
      setTransactions([]);
      return undefined;
    }
    try {
      nwcRef.current = new NWC(uri);
    } catch (e) {
      setError(e.message);
      return undefined;
    }

    // Initial load + poll every 5s to catch settled invoices.
    const refresh = () => loadAll();
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      clearInterval(timer);
      nwcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const loadAll = useCallback(async () => {
    if (!nwcRef.current) return;
    try {
      const [bal, txs] = await Promise.all([
        nwcRef.current.getBalance(),
        nwcRef.current.listTransactions(),
      ]);
      setBalanceMsat(bal.balance);
      setTransactions(txs.transactions || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Connect with a pasted nostr+walletconnect:// string.
  const connect = useCallback((connectionString) => {
    // Validate by constructing once.
    const test = new NWC(connectionString);
    test.close();
    localStorage.setItem(STORAGE_KEY, connectionString);
    setUri(connectionString);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUri("");
  }, []);

  const makeInvoice = useCallback(async (sats, description) => {
    const result = await nwcRef.current.makeInvoice(sats, description);
    loadAll();
    return result; // { invoice, amount, ... }
  }, [loadAll]);

  const payInvoice = useCallback(async (invoice, zapRequest = null) => {
    const result = await nwcRef.current.payInvoice(invoice, zapRequest);
    loadAll();
    return result; // { preimage }
  }, [loadAll]);

  const value = {
    connected,
    balanceMsat,
    balanceSats: balanceMsat == null ? null : Math.floor(balanceMsat / 1000),
    transactions,
    error,
    connect,
    disconnect,
    refresh: loadAll,
    makeInvoice,
    payInvoice,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
