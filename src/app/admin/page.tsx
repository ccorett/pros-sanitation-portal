import { AdminHub } from "@/components/admin/AdminHub";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Administration"
      subtitle="Open a section to review approvals, accounts, stock, invoices, bin services, and HR."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <AdminHub />
    </StaffWorkspaceShell>
  );
}
