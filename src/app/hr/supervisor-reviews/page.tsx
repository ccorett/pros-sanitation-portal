import { SupervisorVacationReviewSection } from "@/components/supervisor/SupervisorVacationReviewSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { AccessLevel } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SupervisorReviewsPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/hr/supervisor-reviews",
  });

  if (employee.accessLevel !== AccessLevel.SUPERVISOR) {
    redirect("/staff-dashboard");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Leave Requests Awaiting Review"
      subtitle="Review vacation requests for your assigned location or bin technicians. Recommend approval or rejection — final manager approval follows."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/hr"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Human Resources
        </Link>
      </div>

      <SupervisorVacationReviewSection />
    </StaffWorkspaceShell>
  );
}
