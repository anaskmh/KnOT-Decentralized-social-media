// ─────────────────────────────────────────────
// Login — create or import a Nostr identity
// ─────────────────────────────────────────────
// Two views:
//   1. Sign up  — enter a display name → generate keys → publish profile
//   2. Sign in  — paste an nsec / hex key
// Matches the Primal-style design from the reference screenshot.

import { useState } from "react";

import Icon from "../components/ui/Icon";
import { KnotMark } from "../components/ui/Logo";
import { useNostr } from "../context/NostrContext";
import { buildProfile } from "../nostr/events";

export default function Login() {
  const { signup, login, relay } = useNostr();
  const [view, setView] = useState("signup"); // "signup" | "signin"
  const [displayName, setDisplayName] = useState("");
  const [nsec, setNsec] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign up: generate keys, then immediately publish a kind-0 profile
  // with the chosen display name so other clients show it right away.
  const handleSignup = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const identity = signup();
      // Publish profile metadata (kind 0) with the chosen name
      const profileEvent = buildProfile(identity.privHex, {
        name: trimmed,
        display_name: trimmed,
      });
      relay.publish(profileEvent);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sign in with an existing nsec
  const handleSignin = () => {
    try {
      setError("");
      login(nsec);
    } catch {
      setError("That doesn't look like a valid nsec or hex key.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="relative w-full max-w-[420px] bg-surface-container-low border border-outline-variant rounded-3xl p-8 flex flex-col items-center gap-5">

        {/* ── Sign Up view ──────────────────────────── */}
        {view === "signup" && (
          <>
            {/* Logo mark */}
            <div className="mt-2 mb-1">
              <KnotMark size={72} />
            </div>

            <h1 className="text-2xl font-black text-on-surface tracking-tight">Sign up</h1>

            {/* Name input — pill shape */}
            <div className="w-full">
              <input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                placeholder="What's your name?"
                autoFocus
                className="w-full bg-transparent border-2 border-outline-variant rounded-full px-5 py-3.5 text-base text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Go button — purple circle */}
            <button
              onClick={handleSignup}
              disabled={!displayName.trim() || loading}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-base active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-primary/30"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                "Go"
              )}
            </button>

            {error && <p className="text-error text-sm">{error}</p>}

            {/* Divider */}
            <div className="w-full flex items-center gap-4 my-1">
              <span className="flex-1 h-px bg-outline-variant" />
            </div>

            {/* Already have an account? */}
            <p className="text-on-surface-variant text-sm">Already have an account?</p>

            {/* Sign in toggle button */}
            <button
              onClick={() => { setView("signin"); setError(""); }}
              className="border border-outline-variant text-on-surface-variant px-8 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
            >
              Sign in
            </button>
          </>
        )}

        {/* ── Sign In view ──────────────────────────── */}
        {view === "signin" && (
          <>
            {/* Back arrow / close → go back to signup */}
            <button
              onClick={() => { setView("signup"); setError(""); }}
              className="absolute top-5 left-5 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Back"
            >
              <Icon name="arrow_back" size={22} />
            </button>

            {/* Logo mark */}
            <div className="mt-2 mb-1">
              <KnotMark size={72} />
            </div>

            <h1 className="text-2xl font-black text-on-surface tracking-tight">Sign in</h1>

            {/* nsec input */}
            <div className="w-full">
              <input
                value={nsec}
                onChange={(e) => { setNsec(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && nsec.trim() && handleSignin()}
                placeholder="Paste your nsec…"
                autoFocus
                className="w-full bg-transparent border-2 border-outline-variant rounded-full px-5 py-3.5 text-base text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            {/* Go button */}
            <button
              onClick={handleSignin}
              disabled={!nsec.trim()}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-base active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-primary/30"
            >
              Go
            </button>

            {error && <p className="text-error text-sm text-center">{error}</p>}

            {/* Divider */}
            <div className="w-full flex items-center gap-4 my-1">
              <span className="flex-1 h-px bg-outline-variant" />
            </div>

            <p className="text-on-surface-variant text-sm">Don't have an account?</p>

            <button
              onClick={() => { setView("signup"); setError(""); }}
              className="border border-outline-variant text-on-surface-variant px-8 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
            >
              Sign up
            </button>
          </>
        )}

        {/* Privacy note */}
        <p className="text-on-surface-variant text-xs opacity-50 text-center mt-1 px-4">
          Your private key never leaves this browser.
        </p>
      </div>
    </div>
  );
}
