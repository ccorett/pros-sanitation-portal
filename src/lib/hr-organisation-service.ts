import type { Employee } from "@prisma/client";
import { AccessLevel, AccountStatus } from "@prisma/client";
import {
  canAccessAdminModule,
  derivePositionFromAccessLevel,
} from "@/lib/access-levels";
import { EMPLOYEE_LOCATION_ASSIGNMENTS } from "@/lib/employee-signup-options";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type OrganisationEmployeeRow = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  position: string;
};

export type OrganisationLocationGroup = {
  locationName: string;
  supervisors: OrganisationEmployeeRow[];
  teamMembers: OrganisationEmployeeRow[];
};

export type HrOrganisationView = {
  scope: "all-locations" | "single-location";
  locations: OrganisationLocationGroup[];
};

function normalizeLocation(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Unassigned";
}

function toOrganisationRow(employee: {
  id: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  jobTitle: string;
  department: string;
  accessLevel: AccessLevel;
}): OrganisationEmployeeRow {
  return {
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    email: employee.companyEmail,
    jobTitle: employee.jobTitle,
    department: employee.department,
    position: derivePositionFromAccessLevel(employee.accessLevel),
  };
}

export function canAccessHrOrganisation(
  employee: Pick<Employee, "accessLevel" | "locationAssignment">,
): boolean {
  if (
    employee.accessLevel === AccessLevel.TEAM_MEMBER ||
    employee.accessLevel === AccessLevel.PENDING_VERIFICATION
  ) {
    return false;
  }

  if (
    isManagerOrAbove(employee.accessLevel) ||
    canAccessAdminModule(employee.accessLevel)
  ) {
    return true;
  }

  if (employee.accessLevel === AccessLevel.SUPERVISOR) {
    return Boolean(employee.locationAssignment?.trim());
  }

  return false;
}

function canViewAllLocations(
  employee: Pick<Employee, "accessLevel">,
): boolean {
  return (
    isManagerOrAbove(employee.accessLevel) ||
    canAccessAdminModule(employee.accessLevel)
  );
}

function sortLocationNames(names: string[]): string[] {
  const knownOrder = new Map(
    EMPLOYEE_LOCATION_ASSIGNMENTS.map((name, index) => [name, index]),
  );

  return [...names].sort((a, b) => {
    const aRank = knownOrder.get(a as (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number]);
    const bRank = knownOrder.get(b as (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number]);

    if (aRank !== undefined && bRank !== undefined) {
      return aRank - bRank;
    }
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });
}

export async function getHrOrganisationForActor(
  actor: Employee,
): Promise<HrOrganisationView> {
  if (!canAccessHrOrganisation(actor)) {
    throw new Error("You are not allowed to view the organisation.");
  }

  const viewAll = canViewAllLocations(actor);
  const actorLocation = normalizeLocation(actor.locationAssignment);

  const employees = await prisma.employee.findMany({
    where: {
      accountStatus: { not: AccountStatus.REMOVED },
      ...(viewAll
        ? {}
        : { locationAssignment: actor.locationAssignment ?? undefined }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyEmail: true,
      jobTitle: true,
      department: true,
      accessLevel: true,
      locationAssignment: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const locationSet = new Set<string>();

  if (viewAll) {
    for (const employee of employees) {
      locationSet.add(normalizeLocation(employee.locationAssignment));
    }
    if (locationSet.size === 0) {
      for (const name of EMPLOYEE_LOCATION_ASSIGNMENTS) {
        locationSet.add(name);
      }
    }
  } else {
    locationSet.add(actorLocation);
  }

  const locations: OrganisationLocationGroup[] = sortLocationNames(
    [...locationSet],
  ).map((locationName) => {
    const atLocation = employees.filter(
      (employee) => normalizeLocation(employee.locationAssignment) === locationName,
    );

    const supervisors = atLocation
      .filter((employee) => employee.accessLevel === AccessLevel.SUPERVISOR)
      .map(toOrganisationRow);

    const teamMembers = atLocation
      .filter((employee) => employee.accessLevel === AccessLevel.TEAM_MEMBER)
      .map(toOrganisationRow);

    return {
      locationName,
      supervisors,
      teamMembers,
    };
  });

  return {
    scope: viewAll ? "all-locations" : "single-location",
    locations,
  };
}
