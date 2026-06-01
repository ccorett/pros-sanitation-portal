import { AdminHub } from "@/components/admin/AdminHub";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Admin Control Hub"
      subtitle="Choose a section to manage approvals, stock, purchasing, bin services, or human resources."
    >
      <AdminHub />
    </StaffWorkspaceShell>
  );
}
