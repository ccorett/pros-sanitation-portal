import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function SettingsPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Settings"
      title="Settings"
      subtitle="Account and portal preferences."
    >
      <div className="glass-card mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <p className="text-sm text-[#ebfbff]/60">
          Settings options will be expanded in a future release. Use the employee
          change PIN flow from Human Resources or contact your supervisor for account updates.
        </p>
      </div>
    </StaffWorkspaceShell>
  );
}
