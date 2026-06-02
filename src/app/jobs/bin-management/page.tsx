import { BinTechnicianServiceTable } from "@/components/bin-service/BinTechnicianServiceTable";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canManageBinLocationSetup } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft, Smartphone } from "lucide-react";
import Link from "next/link";

export default async function BinManagementPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/jobs/bin-management",
  });

  const allowSetupLinks = canManageBinLocationSetup(employee.accessLevel);

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title="Bin Management"
      subtitle={
        allowSetupLinks
          ? "Review all bin service routes, due sites, and technician activity."
          : "Update service activity for assigned bin route locations. Location setup is managed by managers and admin."
      }
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Job Management
        </Link>
        <Link
          href="/jobs/bin-management/today"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#6cc801] transition-colors hover:bg-[#6cc801]/20"
        >
          <Smartphone className="h-4 w-4" aria-hidden="true" />
          Today&apos;s Bin Jobs
        </Link>
      </div>

      <BinTechnicianServiceTable readOnlySetup={!allowSetupLinks} />
    </StaffWorkspaceShell>
  );
}
