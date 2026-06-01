import { AdminApprovalsSection } from "@/components/admin/AdminApprovalsSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminApprovalsPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Requests for Approval"
      subtitle="Stock, vacation, job letters, payslips, job reports, and bin service items."
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminApprovalsSection />
      </div>
    </StaffWorkspaceShell>
  );
}
