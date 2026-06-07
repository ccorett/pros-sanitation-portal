import { SessionInactivityGuard } from "@/components/auth/SessionInactivityGuard";
import { StaffDashboardMetrics } from "@/components/staff/StaffDashboardMetrics";
import { StaffTopNav } from "@/components/layout/StaffTopNav";
import { COMPANY } from "@/lib/constants";
import { WORKSPACE_SHELL_MAX_WIDTH } from "@/lib/workspace-layout";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import {
  canAccessPortalFeature,
  toEmployeeAccessContext,
} from "@/lib/portal-route-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { Briefcase, FileText, Package, Recycle, Users } from "lucide-react";
import Link from "next/link";

const dashboardCards = [
  {
    title: "Job Management",
    description: "Assigned non-bin client locations and service jobs.",
    icon: Briefcase,
    href: "/jobs",
    feature: "jobs" as const,
  },
  {
    title: "Bin Management",
    description: "Bin routes, due sites, and technician service updates.",
    icon: Recycle,
    href: "/jobs/bin-management",
    feature: "binManagement" as const,
  },
  {
    title: "Human Resources",
    description: "Vacation requests, payslips, and job letter requests.",
    icon: Users,
    href: "/hr",
    feature: "humanResources" as const,
  },
  {
    title: "Equipment & Supplies",
    description:
      "Search inventory, check availability, request equipment, supplies and consumables.",
    icon: Package,
    href: "/equipment-supplies",
    feature: "equipmentSupplies" as const,
  },
  {
    title: "Policies",
    description: "Company procedures, PPE requirements, and compliance guides.",
    icon: FileText,
    href: "/policies",
    feature: "humanResources" as const,
  },
];

export default async function StaffDashboardPage() {
  const { session, employee } = await requireStaffAccess({
    pathname: "/staff-dashboard",
  });

  const displayName =
    employee.firstName ??
    session.user.name?.split(" ")[0] ??
    session.user.email.split("@")[0];

  const accessContext = await toEmployeeAccessContext(employee);

  const visibleCards = dashboardCards.filter((card) =>
    canAccessPortalFeature(accessContext, card.feature),
  );

  return (
    <main className="relative min-h-dvh">
      <SessionInactivityGuard />
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-20"
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]/70 backdrop-blur-xl">
        <div
          className={`mx-auto flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8 ${WORKSPACE_SHELL_MAX_WIDTH.standard}`}
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
              <p className="text-xs text-[#ebfbff]/50">Staff Dashboard</p>
            </div>
          </div>
          <StaffTopNav accessContext={accessContext} />
        </div>
      </header>

      <div
        className={`relative z-10 mx-auto w-full min-w-0 px-4 py-8 sm:px-6 lg:px-8 ${WORKSPACE_SHELL_MAX_WIDTH.standard}`}
      >
        <div className="glass-card mb-4 rounded-2xl p-6 sm:p-8">
          <p className="text-sm font-medium text-[#00c6ff]">Welcome Card</p>
          <h1 className="mt-2 text-2xl font-bold text-[#ebfbff] sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#ebfbff]/60 sm:text-base">
            Your dashboard shows only the modules available for your access level.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(260px,320px)_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex lg:min-h-0 lg:self-stretch">
            <div className="lg:flex lg:h-full lg:w-full lg:flex-col [&>*]:lg:h-full">
              <StaffDashboardMetrics />
            </div>
          </div>

          {visibleCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">{card.title}</h2>
                <p className="mt-2 text-sm text-[#ebfbff]/55">{card.description}</p>
                <p className="mt-4 text-xs font-medium text-[#6cc801]">
                  {card.href ? "Open module" : "Coming soon"}
                </p>
              </>
            );

            if (card.href) {
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="glass-card block rounded-2xl p-5 transition-shadow hover:shadow-lg hover:shadow-[#00c6ff]/10 sm:p-6"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={card.title} className="glass-card rounded-2xl p-5 sm:p-6">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
