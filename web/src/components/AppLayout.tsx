import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/**
 * Responsive shell: mobile is a single column with a bottom tab bar; desktop
 * shows a fixed sidebar beside the routed content. Individual screens own their
 * own background color (Home is dark, Settings is #F3ECE0, etc.).
 */
export function AppLayout() {
  return (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
