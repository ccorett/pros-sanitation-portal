"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Briefcase,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { ProtectedPortalLink } from "@/components/auth/ProtectedPortalLink";
import { COMPANY } from "@/lib/constants";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { sidebarNavItems } from "@/lib/mock-data";

const navIcons: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  "Job Management": Briefcase,
  "Equipment & Supplies": Package,
  "Human Resources": Users,
  "My Profile": User,
  Admin: Shield,
  Settings: Settings,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const slideClosed = isMobile && !open;

  return (
    <>
      <motion.div
        initial={false}
        animate={{ opacity: open && isMobile ? 1 : 0, pointerEvents: open && isMobile ? "auto" : "none" }}
        className="fixed inset-0 z-40 bg-[#0c151d]/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden={!open || !isMobile}
      />
      <motion.aside
        initial={false}
        animate={{ x: slideClosed ? "-100%" : 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed left-0 top-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-[#ebfbff]/10 bg-[#0c151d]/95 backdrop-blur-xl lg:static lg:z-auto"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between border-b border-[#ebfbff]/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10">
              <CompanyLogo
                size="sm"
                className="drop-shadow-[0_0_10px_rgba(37,159,0,0.35)]"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#ebfbff]">{COMPANY.shortName}</p>
              <p className="text-xs text-[#ebfbff]/50">Operations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00c6ff]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarNavItems.map((item) => {
            const Icon = navIcons[item.label] ?? LayoutDashboard;
            return (
              <ProtectedPortalLink
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors min-h-[48px]",
                  item.active
                    ? "bg-[#259f00]/20 text-[#6cc801] border border-[#259f00]/30"
                    : "text-[#ebfbff]/70 hover:bg-[#ebfbff]/5 hover:text-[#ebfbff]",
                ].join(" ")}
                aria-current={item.active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label}
              </ProtectedPortalLink>
            );
          })}
        </nav>
        <div className="border-t border-[#ebfbff]/10 px-5 py-4">
          <p className="text-xs text-[#ebfbff]/40">Employee access only</p>
          <p className="mt-1 text-xs font-medium text-[#6cc801]">Secure session required</p>
        </div>
      </motion.aside>
    </>
  );
}
