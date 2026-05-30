import { HrModuleCard } from "@/components/hr/HrModuleCard";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { hrModules } from "@/lib/hr-mock-data";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function HrPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Human Resources"
      subtitle="Employment information, time off, payslips, and letter requests."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {hrModules.map((module) => (
          <HrModuleCard key={module.href} module={module} />
        ))}
      </div>
    </StaffWorkspaceShell>
  );
}
