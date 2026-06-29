// ─────────────────────────────────────────────
// BOLT11 invoice decoding (read-only — no signing/paying here)
// ─────────────────────────────────────────────
// Lets the Send flow show what an invoice actually says (amount, payment
// hash, expiry, description) before the user confirms paying it.
import { decode } from "light-bolt11-decoder";

// Returns null if the string isn't a decodable bolt11 invoice.
export function decodeInvoice(invoice) {
  try {
    const { sections } = decode(invoice.trim());
    const get = (name) => sections.find((s) => s.name === name)?.value;

    const amountMsat = get("amount");
    const timestamp = get("timestamp");
    const expirySeconds = get("expiry") ?? 3600; // BOLT11 default when omitted

    return {
      amountSats: amountMsat == null ? null : Math.floor(Number(amountMsat) / 1000),
      paymentHash: get("payment_hash") || null,
      description: get("description") || null,
      expiresAt: timestamp ? new Date((timestamp + expirySeconds) * 1000) : null,
    };
  } catch {
    return null;
  }
}
