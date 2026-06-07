import type { Employee } from "@prisma/client";
import { formatAccessLevelLabel } from "@/lib/access-levels";
import { getEmployeeLocationSummary } from "@/lib/employee-location-assignment-service";
import {
  formatResponsibilitiesList,
  getDefaultResponsibilitiesForLevel,
} from "@/lib/employee-responsibilities";
import { derivePositionFromAccessLevel } from "@/lib/access-levels";
import { prisma } from "@/lib/prisma";

const MAX_PROFILE_PICTURE_URL_LENGTH = 500_000;

export type EmployeeProfileDto = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  phoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  profilePictureUrl: string | null;
  jobTitle: string;
  position: string | null;
  department: string;
  locationAssignment: string | null;
  primaryLocationAssignment: string | null;
  additionalLocationAssignments: string[];
  accessLevel: string;
  accessLevelLabel: string;
  responsibilitiesLabel: string;
  employmentStatus: string;
  accountStatus: string;
};

export async function buildEmployeeProfileDto(
  employee: Employee,
): Promise<EmployeeProfileDto> {
  const [locationSummary, responsibilityEntries] = await Promise.all([
    getEmployeeLocationSummary(employee.id),
    prisma.employeeResponsibilityEntry.findMany({
      where: { employeeId: employee.id },
      select: { responsibility: true },
      orderBy: { responsibility: "asc" },
    }),
  ]);

  const responsibilities =
    responsibilityEntries.length > 0
      ? responsibilityEntries.map((entry) => entry.responsibility)
      : getDefaultResponsibilitiesForLevel(
          employee.accessLevel,
          employee.operationalGroup,
        );

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    companyEmail: employee.companyEmail,
    phoneNumber: employee.phoneNumber,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    profilePictureUrl: employee.profilePictureUrl,
    jobTitle: employee.jobTitle,
    position: derivePositionFromAccessLevel(employee.accessLevel),
    department: employee.department,
    locationAssignment:
      locationSummary.primaryLocation ?? employee.locationAssignment,
    primaryLocationAssignment:
      locationSummary.primaryLocation ?? employee.locationAssignment,
    additionalLocationAssignments: locationSummary.additionalLocations,
    accessLevel: employee.accessLevel,
    accessLevelLabel: formatAccessLevelLabel(employee.accessLevel),
    responsibilitiesLabel: formatResponsibilitiesList(responsibilities),
    employmentStatus: employee.employmentStatus,
    accountStatus: employee.accountStatus,
  };
}

export async function getEmployeeProfileByUserId(
  userId: string,
): Promise<EmployeeProfileDto | null> {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) return null;
  return buildEmployeeProfileDto(employee);
}

export type UpdateEmployeeProfileInput = {
  phoneNumber?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  profilePictureUrl?: string | null;
};

export async function updateEmployeeProfile(
  employeeId: string,
  input: UpdateEmployeeProfileInput,
): Promise<EmployeeProfileDto> {
  if (input.profilePictureUrl && input.profilePictureUrl.length > MAX_PROFILE_PICTURE_URL_LENGTH) {
    throw new Error("Profile picture is too large. Use a smaller image.");
  }

  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(input.phoneNumber !== undefined
        ? { phoneNumber: input.phoneNumber.trim() || null }
        : {}),
      ...(input.emergencyContactName !== undefined
        ? {
            emergencyContactName: input.emergencyContactName?.trim() || null,
          }
        : {}),
      ...(input.emergencyContactPhone !== undefined
        ? {
            emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
          }
        : {}),
      ...(input.profilePictureUrl !== undefined
        ? { profilePictureUrl: input.profilePictureUrl }
        : {}),
      lastEditedAt: new Date(),
    },
  });

  return buildEmployeeProfileDto(employee);
}
