import { MyProfileSection } from "@/components/profile/MyProfileSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function MyProfilePage() {
  const { session, employee } = await requireStaffAccess();

  const employeeRecord = employee as {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    companyEmail: string;
    phoneNumber: string | null;
    jobTitle: string;
    department: string;
    employmentStatus: string;
    accountStatus: string;
    position?: string | null;
    locationAssignment?: string | null;
  };

  return (
    <StaffWorkspaceShell
      sectionLabel="My Profile"
      title="My Profile"
      subtitle="View and update your personal and employment information."
    >
      <MyProfileSection
        initial={{
          userId: session.user.id,
          employeeRecordId: employeeRecord.id,
          employeePublicId: employeeRecord.employeeId,
          firstName: employeeRecord.firstName,
          lastName: employeeRecord.lastName,
          email: employeeRecord.companyEmail || session.user.email,
          phoneNumber: employeeRecord.phoneNumber,
          jobTitle: employeeRecord.jobTitle,
          position: employeeRecord.position ?? null,
          department: employeeRecord.department,
          locationAssignment: employeeRecord.locationAssignment ?? null,
          employmentStatus: employeeRecord.employmentStatus,
          accountStatus: employeeRecord.accountStatus,
        }}
      />
    </StaffWorkspaceShell>
  );
}
