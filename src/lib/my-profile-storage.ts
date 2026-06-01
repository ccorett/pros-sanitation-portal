import {
  getEmployeeOnboardingProfile,
  saveEmployeeOnboardingProfile,
  type StoredEmployeeOnboardingProfile,
} from "@/lib/employee-profile-storage";
import { getProfilePicture, setProfilePicture } from "@/lib/hr-client-storage";

export function getMergedProfileView(
  userId: string,
  employeeRecordId: string,
  server: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    jobTitle: string;
    position: string | null;
    department: string;
    locationAssignment: string | null;
    employmentStatus: string;
    accountStatus: string;
    employeePublicId: string;
  },
) {
  const stored = getEmployeeOnboardingProfile(userId);

  return {
    firstName: stored?.firstName ?? server.firstName,
    lastName: stored?.lastName ?? server.lastName,
    fullName: `${stored?.firstName ?? server.firstName} ${stored?.lastName ?? server.lastName}`.trim(),
    employeePublicId: server.employeePublicId,
    email: stored?.email ?? server.email,
    phoneNumber: stored?.phoneNumber ?? server.phoneNumber ?? "",
    jobTitle: stored?.jobTitle ?? server.jobTitle,
    position: stored?.position ?? server.position ?? "—",
    department: stored?.department ?? server.department,
    locationAssignment:
      stored?.locationAssignment ?? server.locationAssignment ?? "—",
    employmentStatus: formatStatusLabel(server.employmentStatus),
    accountStatus: formatStatusLabel(server.accountStatus),
    profilePicture:
      stored?.profilePictureDataUrl ??
      getProfilePicture(employeeRecordId) ??
      null,
  };
}

export function saveMyProfileUpdates(
  userId: string,
  employeeRecordId: string,
  current: StoredEmployeeOnboardingProfile | null,
  updates: {
    phoneNumber: string;
    profilePictureDataUrl?: string | null;
    baseProfile: Omit<
      StoredEmployeeOnboardingProfile,
      "updatedAt" | "profilePictureDataUrl" | "phoneNumber"
    >;
  },
) {
  const payload: Omit<StoredEmployeeOnboardingProfile, "updatedAt"> = {
    ...(current ?? updates.baseProfile),
    phoneNumber: updates.phoneNumber.trim(),
    ...(updates.profilePictureDataUrl
      ? { profilePictureDataUrl: updates.profilePictureDataUrl }
      : current?.profilePictureDataUrl
        ? { profilePictureDataUrl: current.profilePictureDataUrl }
        : {}),
  };

  saveEmployeeOnboardingProfile(userId, payload);

  if (updates.profilePictureDataUrl) {
    setProfilePicture(employeeRecordId, updates.profilePictureDataUrl);
  }
}

function formatStatusLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
