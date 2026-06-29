// Bottom nav + FAB for small screens (from the design).
import { NavLink } from "react-router-dom";
import Icon from "../ui/Icon";
import { useNostr } from "../../context/NostrContext";

const ITEMS = [
  { icon: "home", path: "/" },
  { icon: "search", path: "/explore" },
  { icon: "movie", path: "/shorts" },
  { icon: "notifications", path: "/notifications" },
  { icon: "mail", path: "/messages" },
];

export default function MobileNav({ onCompose }) {
  const { unreadCount, unreadDmCount } = useNostr();

  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full h-16 bg-background/90 backdrop-blur-lg border-t border-outline-variant flex items-center justify-around lg:hidden z-50">
        {ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => (isActive ? "text-primary" : "text-on-surface-variant")}
          >
            {({ isActive }) => (
              <span className="relative">
                <Icon name={item.icon} fill={isActive} />
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {item.path === "/messages" && unreadDmCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5">
                    {unreadDmCount > 99 ? "99+" : unreadDmCount}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onCompose}
        className="fixed bottom-20 right-4 lg:hidden w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-on-primary z-50 active:scale-90 transition-transform"
      >
        <Icon name="add" size={28} />
      </button>
    </>
  );
}
