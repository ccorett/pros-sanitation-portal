import { HrModuleCard } from "@/components/hr/HrModuleCard";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canAccessHrOrganisation } from "@/lib/hr-organisation-service";
import { hrModules, payslipAdministrationModule } from "@/lib/hr-mock-data";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { AccessLevel } from "@prisma/client";
import { Building2 } from "lucide-react";
import Link from "next/link";

export default async function HrPage() {
  const { employee } = await requireStaffAccess({ pathname: "/hr" });
  const [vacationModule, jobLettersModule, payslipsModule] = hrModules;
  const showPayslipAdministration = isManagerOrAbove(employee.accessLevel);

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Human Resources"
      subtitle="Manage leave requests, payslips and employment documents."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      {canAccessHrOrganisation(employee) ? (
        <div className="mb-6 glass-card rounded-2xl border border-[#6cc801]/25 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6cc801]/15 text-[#6cc801]">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-lg font-bold text-[#ebfbff]">Team Structure</p>
          <p className="mt-2 text-sm text-[#ebfbff]/65">
            {isManagerOrAbove(employee.accessLevel)
              ? "See every location with assigned supervisors and employees."
              : "See supervisors and employees for your assigned location."}
          </p>
          <Link
            href="/hr/organisation"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#6cc801] hover:bg-[#6cc801]/20"
          >
            View Team Structure
          </Link>
        </div>
      ) : null}

      {employee.accessLevel === AccessLevel.SUPERVISOR ? (
        <div className="mb-6 glass-card rounded-2xl border border-[#00c6ff]/25 p-5">
          <p className="text-lg font-bold text-[#ebfbff]">Supervisor Review Queue</p>
          <p className="mt-2 text-sm text-[#ebfbff]/65">
            Vacation requests for your location or bin technicians are waiting for
            supervisor review before final manager approval.
          </p>
          <Link
            href="/hr/supervisor-reviews"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#6cc801] hover:bg-[#6cc801]/20"
          >
            Open Supervisor Review Queue
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <HrModuleCard module={vacationModule} />
        {showPayslipAdministration ? (
          <HrModuleCard module={payslipAdministrationModule} />
        ) : null}
        <HrModuleCard module={jobLettersModule} />
        <HrModuleCard module={payslipsModule} />
      </div>
    </StaffWorkspaceShell>
  );
}
