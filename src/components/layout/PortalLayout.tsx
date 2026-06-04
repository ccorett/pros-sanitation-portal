"use client";

import { useState } from "react";
import { AnimatedBackground } from "./AnimatedBackground";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-dvh">
      <AnimatedBackground />
      <div className="flex min-h-dvh">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onMenuClick={() => setSidebarOpen(true)} />
          <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
