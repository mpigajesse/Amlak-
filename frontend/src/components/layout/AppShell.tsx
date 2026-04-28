import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * Shell principal de l'application — affiché pour toutes les routes authentifiées.
 *
 * Layout desktop (≥ 768px) :
 *   [Sidebar (w-60, fixe gauche)] | [Topbar (h-14) + Outlet]
 *
 * Layout mobile (< 768px) :
 *   [Topbar] / [Outlet] / [MobileNav (bottom bar fixe)]
 *   Sidebar accessible via bouton menu dans la Topbar (drawer overlay)
 */
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Sidebar desktop (always visible ≥ md) ────────────────── */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={closeSidebar}
      />

      {/* ── Zone principale ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMenuClick={openSidebar} />

        <main
          className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6"
          id="main-content"
          role="main"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Navigation mobile bottom bar ──────────────────────────── */}
      <MobileNav />
    </div>
  );
}
