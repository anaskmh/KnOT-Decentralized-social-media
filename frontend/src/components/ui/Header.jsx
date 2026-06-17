// Sticky glass column header used at the top of each center screen.
import Icon from "./Icon";

export default function Header({ title, subtitle, right, onBack }) {
  return (
    <header className="sticky top-0 z-40 w-full glass-header flex justify-between items-center min-h-14 px-gutter border-b border-outline-variant">
      <div className="flex items-center gap-4 py-2">
        {onBack && (
          <button onClick={onBack} className="text-on-surface hover:text-primary">
            <Icon name="arrow_back" />
          </button>
        )}
        <div>
          <h2 className="font-h2 text-h2 font-bold">{title}</h2>
          {subtitle && <p className="text-on-surface-variant text-mono-label">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex gap-4 items-center">{right}</div>}
    </header>
  );
}
