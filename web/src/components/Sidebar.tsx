import { NavLink } from "react-router-dom";
import { Home, List, ScanLine, Tags, Settings } from "lucide-react";
import { LogoTile } from "./Logo";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/catalog", label: "Catalog", icon: List, end: false },
  { to: "/labels", label: "Labels", icon: Tags, end: false },
  { to: "/scan", label: "Scan", icon: ScanLine, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

/** Fixed left sidebar navigation (desktop / wide, badges 8a-8b). */
export function Sidebar() {
  return (
    <aside className="hidden w-[240px] flex-none flex-col gap-1 border-r border-border-3 bg-cream px-4 py-6 md:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <LogoTile size={40} radius={12} />
        <span className="font-serif text-[22px] font-semibold">CoffeeLog</span>
      </div>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-[12px] px-3 py-[10px] text-[14px] font-medium ${
              isActive ? "bg-tan text-brand" : "text-muted hover:bg-tan/60"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={2} color={isActive ? "#5C3D28" : "#8A7867"} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
