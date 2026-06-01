import { AdminStockSection } from "@/components/admin/AdminStockSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminStockManagementPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Stock Management"
      subtitle="Edits sync with Equipment & Supplies for all staff."
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminStockSection />
      </div>
    </StaffWorkspaceShell>
  );
}
