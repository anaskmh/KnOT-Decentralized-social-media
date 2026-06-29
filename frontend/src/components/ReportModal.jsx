// ─────────────────────────────────────────────
// ReportModal — report a user (NIP-56)
// ─────────────────────────────────────────────
// Pick a reason, optionally add detail, publish a kind-1984 report event.
import { useState } from "react";

import Icon from "./ui/Icon";
import DisplayName from "./ui/DisplayName";
import { useNostr } from "../context/NostrContext";
import { buildReport } from "../nostr/events";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "nudity", label: "Nudity" },
  { value: "profanity", label: "Profanity" },
  { value: "illegal", label: "Illegal content" },
  { value: "malware", label: "Malware" },
  { value: "other", label: "Other" },
];

export default function ReportModal({ pubkey, onClose }) {
  const { identity, relay } = useNostr();
  const [reason, setReason] = useState(null);
  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!reason) return;
    const event = buildReport(identity.privHex, pubkey, reason, info.trim());
    relay.publish(event);
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <span className="font-bold text-on-surface">Report user</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={20} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-3 text-on-surface-variant">
            <Icon name="check_circle" size={36} className="text-tertiary-fixed" />
            <p className="text-body-md text-on-surface">Report submitted. Thanks for keeping KnOT safe.</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-on-surface-variant text-body-md">
              Reporting <DisplayName pubkey={pubkey} className="font-bold text-on-surface" />
            </p>

            <div className="flex flex-col gap-1">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    reason === r.value
                      ? "border-primary bg-primary-container/20 text-on-surface"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {r.label}
                  {reason === r.value && <Icon name="check" size={18} className="text-primary" />}
                </button>
              ))}
            </div>

            <div>
              <label className="text-on-surface-variant text-mono-label">Additional information (optional)</label>
              <textarea
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="Tell us more about this report…"
                rows={3}
                className="mt-1 w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-body-md focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              onClick={submit}
              disabled={!reason}
              className="bg-error text-on-error font-bold py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
