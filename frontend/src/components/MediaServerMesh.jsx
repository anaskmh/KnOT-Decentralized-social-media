// ─────────────────────────────────────────────
// MediaServerMesh — animated node graph of media server options
// ─────────────────────────────────────────────
// Same visual language as RelayMesh: each media server is a node linked to
// the hub (you). ANY number of nodes can be connected at once (just like the
// relay pool) — every connected node lights up green, the rest sit dim/red.
export default function MediaServerMesh({ servers, connected }) {
  const width = 600;
  const height = 200;
  const cx = width / 2;
  const cy = height / 2;

  const nodes = servers.map((s, i) => {
    const angle = (i / Math.max(servers.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 70 + (i % 2) * 25;
    return {
      ...s,
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
          key={`l${n.value}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={connected.includes(n.value) ? "#06b6d4" : "#4d4354"}
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

      {/* server nodes */}
      {nodes.map((n) => {
        const active = connected.includes(n.value);
        const color = active ? "#4edea3" : "#ffb4ab";
        return (
          <g key={n.value}>
            {active && (
              <circle cx={n.x} cy={n.y} r="11" fill="none" stroke={color} strokeWidth="1" opacity="0.6">
                <animate attributeName="r" values="8;15;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
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
