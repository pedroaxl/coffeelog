import { NavLink } from "react-router-dom";
import { Home, List, ScanLine, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/catalog", label: "Catalog", icon: List, end: false },
  { to: "/scan", label: "Scan", icon: ScanLine, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

/** Bottom tab bar (mobile). Desktop uses the Sidebar instead. */
export function BottomNav() {
  return (
    <nav className="flex h-[72px] flex-none items-center justify-around border-t border-border-3 bg-cream px-4 pb-2 md:hidden">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex flex-col items-center gap-[3px]"
        >
          {({ isActive }) => (
            <>
              <Icon
                size={22}
                strokeWidth={2}
                color={isActive ? "#5C3D28" : "#B5A48F"}
              />
              <span
                className="text-[10.5px]"
                style={{
                  color: isActive ? "#5C3D28" : "#B5A48F",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
