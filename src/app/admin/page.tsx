import { AdminHub } from "@/components/admin/AdminHub";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Admin Control Hub"
      subtitle="Counts load from Neon. Open a section to review pending equipment, HR, stock, bin, and account items."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <AdminHub />
    </StaffWorkspaceShell>
  );
}
