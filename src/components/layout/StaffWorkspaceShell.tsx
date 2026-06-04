import { StaffTopNav } from "@/components/layout/StaffTopNav";
import { COMPANY } from "@/lib/constants";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import type { AccessLevel, OperationalGroup } from "@prisma/client";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import type { ReactNode } from "react";

type StaffWorkspaceShellProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  employeeId: string;
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  companyEmail: string;
  children: ReactNode;
};

export async function StaffWorkspaceShell({
  sectionLabel,
  title,
  subtitle,
  employeeId,
  accessLevel,
  operationalGroup,
  companyEmail,
  children,
}: StaffWorkspaceShellProps) {
  const accessContext = await toEmployeeAccessContext({
    id: employeeId,
    accessLevel,
    operationalGroup,
    companyEmail,
  });
  return (
    <main className="relative min-h-dvh">
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-20"
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-3 px-4 py-3 md:min-h-16 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0 md:px-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
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
          <StaffTopNav accessContext={accessContext} />
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
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
