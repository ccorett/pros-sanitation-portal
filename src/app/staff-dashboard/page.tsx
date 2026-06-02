import { StaffTopNav } from "@/components/layout/StaffTopNav";
import { COMPANY } from "@/lib/constants";
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
    href: undefined,
    feature: "jobs" as const,
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

  const accessContext = toEmployeeAccessContext(employee);

  const visibleCards = dashboardCards.filter((card) =>
    canAccessPortalFeature(accessContext, card.feature),
  );

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
              <p className="text-xs text-[#ebfbff]/50">Staff Dashboard</p>
            </div>
          </div>
          <StaffTopNav accessContext={accessContext} />
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="glass-card mb-6 rounded-2xl p-6 sm:p-8">
          <p className="text-sm font-medium text-[#00c6ff]">Welcome Card</p>
          <h1 className="mt-2 text-2xl font-bold text-[#ebfbff] sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#ebfbff]/60 sm:text-base">
            Your dashboard shows only the modules available for your access level.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
