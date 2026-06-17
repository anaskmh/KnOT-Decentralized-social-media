// Glassmorphism compose modal (opened by the Post buttons / FAB).
import Icon from "./ui/Icon";
import Composer from "./Composer";

export default function ComposeModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-gutter py-3 border-b border-outline-variant">
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
          <span className="font-bold text-on-surface">New note</span>
          <span className="w-6" />
        </div>
        <Composer autoFocus onPosted={onClose} />
      </div>
    </div>
  );
}
