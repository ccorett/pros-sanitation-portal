import { SessionInactivityGuard } from "@/components/auth/SessionInactivityGuard";
import { StaffTopNav } from "@/components/layout/StaffTopNav";
import { COMPANY } from "@/lib/constants";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import {
  WORKSPACE_SHELL_MAX_WIDTH,
  type WorkspaceLayoutWidth,
} from "@/lib/workspace-layout";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { canAccessInvoiceManagement } from "@/lib/invoice-access";
import type { AccessLevel, OperationalGroup } from "@prisma/client";
import type { ReactNode } from "react";

type StaffWorkspaceShellProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  employeeId: string;
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  companyEmail: string;
  layoutWidth?: WorkspaceLayoutWidth;
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
  layoutWidth = "standard",
  children,
}: StaffWorkspaceShellProps) {
  const shellMaxWidth = WORKSPACE_SHELL_MAX_WIDTH[layoutWidth];
  const accessContext = await toEmployeeAccessContext({
    id: employeeId,
    accessLevel,
    operationalGroup,
    companyEmail,
  });
  const showInvoiceNotifications = canAccessInvoiceManagement(accessContext);
  return (
    <main className="relative min-h-dvh">
      <SessionInactivityGuard />
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-20"
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
        <div
          className={`mx-auto flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8 ${shellMaxWidth}`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10">
              <CompanyLogo
                size="sm"
                className="drop-shadow-[0_0_10px_rgba(37,159,0,0.35)]"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#ebfbff]">{COMPANY.shortName}</p>
              <p className="text-xs text-[#ebfbff]/50">{sectionLabel}</p>
            </div>
          </div>
          <StaffTopNav
            accessContext={accessContext}
            showInvoiceNotifications={showInvoiceNotifications}
          />
        </div>
      </header>

      <div
        className={`relative z-10 mx-auto w-full min-w-0 px-4 py-8 sm:px-6 lg:px-8 ${shellMaxWidth}`}
      >
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
