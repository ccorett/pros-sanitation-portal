import { EquipmentRequestsApprovalSection } from "@/components/equipment-supplies/EquipmentRequestsApprovalSection";
import { ManagerApprovalsSection } from "@/components/manager/ManagerApprovalsSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function ManagerApprovalsPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/manager/approvals",
  });

  return (
    <StaffWorkspaceShell
      sectionLabel="Manager"
      title="Final Leave Approvals"
      subtitle="Approve or reject vacation requests after supervisor review."
      layoutWidth="wide"
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <ManagerApprovalsSection />
      <div className="mt-12">
        <EquipmentRequestsApprovalSection />
      </div>
    </StaffWorkspaceShell>
  );
}
