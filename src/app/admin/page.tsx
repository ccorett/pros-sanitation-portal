import { AdminHub } from "@/components/admin/AdminHub";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { getAccountAccessHubCard } from "@/lib/admin-hub-server";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });
  const accountAccessCard = await getAccountAccessHubCard();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Admin Control Hub"
      subtitle="Choose a section to manage approvals, stock, purchasing, bin services, human resources, or account access."
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <AdminHub serverSections={[accountAccessCard]} />
    </StaffWorkspaceShell>
  );
}
