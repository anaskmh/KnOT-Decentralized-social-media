// ─────────────────────────────────────────────
// Logo — the KnOT brand mark
// ─────────────────────────────────────────────
// Uses the official logo assets in /public (cropped from the original
// knotlogo.png in the repo root):
//   /knotlogo.png  — full lockup: knot mark + "KnOT" wordmark
//   /knotmark.png  — just the knot mark (square), also the favicon
// The wordmark's "Kn" is a white outline, designed for dark backgrounds.

export function KnotMark({ size = 36 }) {
  return (
    <img
      src="/knotmark.png"
      alt="KnOT"
      style={{ width: size, height: size }}
      className="select-none"
      draggable={false}
    />
  );
}

export default function Logo({ size = 34 }) {
  // The lockup is wide (640×175); `size` sets its height.
  return (
    <img
      src="/knotlogo.png"
      alt="KnOT — decentralized social"
      style={{ height: size }}
      className="select-none w-auto"
      draggable={false}
    />
  );
}
