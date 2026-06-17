// Material Symbols icon — the same icon set the design uses.
// <Icon name="home" fill /> renders a filled glyph; size in px.
export default function Icon({ name, fill = false, className = "", style = {}, size }) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? "fill" : ""} ${className}`}
      style={{ ...(size ? { fontSize: size } : {}), ...style }}
    >
      {name}
    </span>
  );
}
