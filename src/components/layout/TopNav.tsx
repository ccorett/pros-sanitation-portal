"use client";

import { Menu, Shield } from "lucide-react";
import Link from "next/link";
import { COMPANY } from "@/lib/constants";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2.5 text-[#ebfbff]/80 hover:bg-[#ebfbff]/10 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00c6ff]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#ebfbff]/50">
            <Shield className="h-4 w-4 text-[#6cc801]" aria-hidden="true" />
            <span>Authorized personnel only</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="#login"
            className="hidden sm:inline-flex items-center justify-center rounded-xl border border-[#259f00]/40 bg-[#259f00]/15 px-4 py-2.5 text-sm font-semibold text-[#6cc801] hover:bg-[#259f00]/25 transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00c6ff]"
          >
            Sign In
          </Link>
        </div>
      </div>
      <div className="sr-only">{COMPANY.name} internal portal</div>
    </header>
  );
}
