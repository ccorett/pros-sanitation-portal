import { HrModuleCard } from "@/components/hr/HrModuleCard";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { hrModules } from "@/lib/hr-mock-data";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { AccessLevel } from "@prisma/client";
import Link from "next/link";

export default async function HrPage() {
  const { employee } = await requireStaffAccess({ pathname: "/hr" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Human Resources"
      subtitle="Employment information, time off, payslips, and letter requests."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      {employee.accessLevel === AccessLevel.SUPERVISOR ? (
        <div className="mb-6 glass-card rounded-2xl border border-[#00c6ff]/25 p-5">
          <p className="text-sm font-semibold text-[#00c6ff]">Supervisor review queue</p>
          <p className="mt-2 text-sm text-[#ebfbff]/65">
            Vacation requests for your location or bin technicians are waiting for
            Aware or Unaware review before manager approval.
          </p>
          <Link
            href="/hr/supervisor-reviews"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#6cc801] hover:bg-[#6cc801]/20"
          >
            Open Team Requests
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {hrModules.map((module) => (
          <HrModuleCard key={module.href} module={module} />
        ))}
      </div>
    </StaffWorkspaceShell>
  );
}
