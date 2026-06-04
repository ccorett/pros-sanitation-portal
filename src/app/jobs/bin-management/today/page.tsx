import { BinTodaysJobsTable } from "@/components/bin-service/BinTodaysJobsTable";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BinJobsTodayPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/jobs/bin-management/today",
  });

  return (
    <StaffWorkspaceShell
      sectionLabel="Bin Management"
      title="Today's Bin Jobs"
      subtitle="Due and overdue bin locations only. Complete service to reset last service date to today."
          employeeId={employee.id}
          accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/jobs/bin-management"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Bin Management
        </Link>
      </div>

      <BinTodaysJobsTable />
    </StaffWorkspaceShell>
  );
}
