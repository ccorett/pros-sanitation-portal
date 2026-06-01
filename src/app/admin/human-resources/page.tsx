import { AdminHumanResourcesSection } from "@/components/admin/AdminHumanResourcesSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminHumanResourcesPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Human Resources"
      subtitle="Vacation, job letter, and payslip request approvals."
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminHumanResourcesSection />
      </div>
    </StaffWorkspaceShell>
  );
}
