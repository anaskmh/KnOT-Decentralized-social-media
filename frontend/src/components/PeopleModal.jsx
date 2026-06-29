import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Avatar from "./ui/Avatar";
import Icon from "./ui/Icon";
import DisplayName from "./ui/DisplayName";

export default function PeopleModal({ title, pubkeys = [], onClose }) {
  const navigate = useNavigate();
  const uniquePubkeys = useMemo(() => [...new Set(pubkeys)].filter(Boolean), [pubkeys]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <span className="font-bold text-on-surface">{title}</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface" type="button">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {uniquePubkeys.length === 0 ? (
            <div className="p-6 text-center text-on-surface-variant text-body-md">
              No one yet.
            </div>
          ) : (
            uniquePubkeys.map((pk) => (
              <button
                key={pk}
                onClick={() => {
                  onClose();
                  navigate(`/profile/${pk}`);
                }}
                className="flex items-center gap-3 px-4 py-3 w-full hover:bg-surface-container transition-colors text-left"
                type="button"
              >
                <Avatar pubkey={pk} size={40} />
                <DisplayName pubkey={pk} className="font-bold text-on-surface truncate" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
