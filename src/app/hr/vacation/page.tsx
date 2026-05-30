import { VacationRequestsSection } from "@/components/hr/VacationRequestsSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function HrVacationPage() {
  const { employee } = await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Vacation Requests"
      subtitle="Submit time off requests and track Pending, Approved, or Rejected status."
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

      <VacationRequestsSection employeeRecordId={employee.id} />
    </StaffWorkspaceShell>
  );
}
