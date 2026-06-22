import { AdminAccountsSection } from "@/components/admin/AdminAccountsSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminAccountsPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin/accounts" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Employee Accounts"
      subtitle="Approve new accounts, assign roles, and manage employee account status."
      layoutWidth="wide"
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminAccountsSection />
      </div>
    </StaffWorkspaceShell>
  );
}
