import { ProfileSection } from "@/components/hr/ProfileSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function HrProfilePage() {
  const { session, employee } = await requireStaffAccess();

  const name = `${employee.firstName} ${employee.lastName}`.trim();

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="My Profile"
      subtitle="View your employment details and upload a profile picture."
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

      <ProfileSection
        employeeRecordId={employee.id}
        employeePublicId={employee.employeeId}
        name={name}
        email={employee.companyEmail || session.user.email}
        phoneNumber={employee.phoneNumber}
        position={employee.department}
        jobTitle={employee.jobTitle}
      />
    </StaffWorkspaceShell>
  );
}
