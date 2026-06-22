import { ApprovalInboxSection } from "@/components/admin/ApprovalInboxSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminApprovalsPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin/approvals" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Approval Inbox"
      subtitle="Review live requests from equipment, HR, and bin services. Open a record to review in its section."
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
