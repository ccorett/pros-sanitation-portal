import { TeamCheckInSection } from "@/components/jobs/TeamCheckInSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canAccessTeamCheckIn } from "@/lib/attendance-log-service";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TeamCheckInPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/jobs/team-check-in",
  });

  if (!canAccessTeamCheckIn(employee)) {
    redirect("/staff-dashboard");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title="Team Check-In"
      subtitle="Record location-based attendance and review the attendance log."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Job Management
        </Link>
      </div>

      <TeamCheckInSection isManager={isManagerOrAbove(employee.accessLevel)} />
    </StaffWorkspaceShell>
  );
}
