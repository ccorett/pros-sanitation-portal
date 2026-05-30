import { AdminApprovalsSection } from "@/components/admin/AdminApprovalsSection";
import { AdminBinManagementSection } from "@/components/admin/AdminBinManagementSection";
import { AdminPurchasingSection } from "@/components/admin/AdminPurchasingSection";
import { AdminStockSection } from "@/components/admin/AdminStockSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Admin Control Centre"
      subtitle="Manage approvals, stock, purchasing, and operational setup."
    >
      <div className="space-y-12">
        <AdminApprovalsSection />
        <AdminStockSection />
        <AdminPurchasingSection />
        <AdminBinManagementSection />
      </div>
    </StaffWorkspaceShell>
  );
}
