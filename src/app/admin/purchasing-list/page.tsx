import { AdminPurchasingSection } from "@/components/admin/AdminPurchasingSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPurchasingListPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Purchasing List"
      subtitle="Auto-generated when available quantity is at or below reorder level."
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminPurchasingSection />
      </div>
    </StaffWorkspaceShell>
  );
}
