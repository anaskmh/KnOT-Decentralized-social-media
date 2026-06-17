// ─────────────────────────────────────────────
// RelayMesh — animated node graph of the relay pool
// ─────────────────────────────────────────────
// A stylized "mesh" visualization: each relay is a node, all linked to a
// central hub (you). Green = connected, red = offline. Pure SVG.
export default function RelayMesh({ relays }) {
  const width = 600;
  const height = 200;
  const cx = width / 2;
  const cy = height / 2;

  // Spread nodes around the hub.
  const nodes = relays.map((r, i) => {
    const angle = (i / Math.max(relays.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 70 + (i % 2) * 25;
    return {
      ...r,
      x: cx + Math.cos(angle) * radius * 1.8,
      y: cy + Math.sin(angle) * radius,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[200px] rounded-xl bg-surface-container-lowest border border-outline-variant">
      {/* faint grid */}
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={(i * width) / 12} y1="0" x2={(i * width) / 12} y2={height} stroke="#2f3336" strokeWidth="0.5" opacity="0.4" />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={(i * height) / 4} x2={width} y2={(i * height) / 4} stroke="#2f3336" strokeWidth="0.5" opacity="0.4" />
      ))}

      {/* links */}
      {nodes.map((n) => (
        <line
          key={`l${n.url}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={n.status === "connected" ? "#06b6d4" : "#4d4354"}
          strokeWidth="1.5"
          opacity="0.6"
        />
      ))}

      {/* hub (you) */}
      <circle cx={cx} cy={cy} r="10" fill="#ddb7ff" />
      <circle cx={cx} cy={cy} r="16" fill="none" stroke="#ddb7ff" strokeWidth="1" opacity="0.5">
        <animate attributeName="r" values="12;22;12" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* relay nodes */}
      {nodes.map((n) => {
        const color = n.status === "connected" ? "#4edea3" : "#ffb4ab";
        return (
          <g key={n.url}>
            <circle cx={n.x} cy={n.y} r="6" fill={color}>
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x={n.x} y={n.y - 12} textAnchor="middle" fill="#cfc2d6" fontSize="10" fontFamily="JetBrains Mono">
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
