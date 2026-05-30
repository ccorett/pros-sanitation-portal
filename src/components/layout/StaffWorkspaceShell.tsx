import { SignOutButton } from "@/components/auth/SignOutButton";
import { COMPANY } from "@/lib/constants";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import Link from "next/link";
import type { ReactNode } from "react";

type StaffWorkspaceShellProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StaffWorkspaceShell({
  sectionLabel,
  title,
  subtitle,
  children,
}: StaffWorkspaceShellProps) {
  return (
    <main className="relative min-h-dvh">
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-20"
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10">
              <CompanyLogo
                size="sm"
                className="drop-shadow-[0_0_10px_rgba(37,159,0,0.35)]"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#ebfbff]">{COMPANY.shortName}</p>
              <p className="text-xs text-[#ebfbff]/50">{sectionLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/staff-dashboard"
              className="text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="hidden text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors sm:inline"
            >
              Portal Home
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#00c6ff]">{sectionLabel}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#ebfbff] sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-sm text-[#ebfbff]/60 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
