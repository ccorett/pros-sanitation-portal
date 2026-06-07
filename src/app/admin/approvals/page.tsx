import { ApprovalInboxSection } from "@/components/admin/ApprovalInboxSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminApprovalsPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Approval Inbox"
      subtitle="Live requests from equipment, HR, and bin service modules in Neon. Open a record to review in its module."
      layoutWidth="wide"
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <ApprovalInboxSection />
      </div>
    </StaffWorkspaceShell>
  );
}
