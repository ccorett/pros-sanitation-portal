import { MyProfileSection } from "@/components/profile/MyProfileSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function MyProfilePage() {
  const { employee } = await requireStaffAccess({ pathname: "/my-profile" });

  return (
    <StaffWorkspaceShell
      sectionLabel="My Profile"
      title="My Profile"
      subtitle="View and update your personal and employment information."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <MyProfileSection />
    </StaffWorkspaceShell>
  );
}
