import {
  AccessLevel,
  EmployeeResponsibility,
  OperationalGroup,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultResponsibilitiesForLevel } from "@/lib/employee-responsibilities";
import { canAccessGeneralJobs } from "@/lib/job-assignment-access";
import { resolveEmployeeJobAssignments } from "@/lib/job-assignment-service";
import { canAccessAdminModule } from "@/lib/access-levels";
import {
  canAccessBinManagement,
  canAccessDelivery,
  canAccessEquipmentSupplies,
  createEmployeeAccessContext,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";

export type PortalFeature =
  | "dashboard"
  | "jobs"
  | "delivery"
  | "binManagement"
  | "humanResources"
  | "supervisorTeamRequests"
  | "hrOrganisation"
  | "myProfile"
  | "equipmentSupplies"
  | "admin"
  | "managerApprovals";

export type PortalNavItem = {
  label: string;
  href: string;
  feature: PortalFeature;
};

const FEATURE_ACCESS: Record<
  PortalFeature,
  (ctx: EmployeeAccessContext) => boolean
> = {
  dashboard: (ctx) =>
    ctx.accessLevel !== AccessLevel.PENDING_VERIFICATION,
  jobs: (ctx) => canAccessGeneralJobs(ctx),
  delivery: (ctx) => canAccessDelivery(ctx),
  binManagement: (ctx) => canAccessBinManagement(ctx),
  humanResources: (ctx) =>
    ctx.accessLevel !== AccessLevel.PENDING_VERIFICATION,
  supervisorTeamRequests: (ctx) => {
    if (ctx.accessLevel !== AccessLevel.SUPERVISOR) {
      return false;
    }

    if (ctx.responsibilities.includes(EmployeeResponsibility.HR_REVIEW)) {
      return true;
    }

    const onlyBinTechnician =
      ctx.responsibilities.length > 0 &&
      ctx.responsibilities.every(
        (item) =>
          item === EmployeeResponsibility.BIN_TECHNICIAN ||
          item === EmployeeResponsibility.GENERAL_OPERATIONS,
      ) &&
      ctx.responsibilities.includes(EmployeeResponsibility.BIN_TECHNICIAN);

    return (
      ctx.operationalGroup !== OperationalGroup.BIN_TECHNICIAN && !onlyBinTechnician
    );
  },
  hrOrganisation: (ctx) => {
    if (
      ctx.accessLevel === AccessLevel.TEAM_MEMBER ||
      ctx.accessLevel === AccessLevel.PENDING_VERIFICATION
    ) {
      return false;
    }
    return (
      isManagerOrAbove(ctx.accessLevel) ||
      canAccessAdminModule(ctx.accessLevel) ||
      ctx.accessLevel === AccessLevel.SUPERVISOR
    );
  },
  myProfile: (ctx) =>
    ctx.accessLevel !== AccessLevel.PENDING_VERIFICATION,
  equipmentSupplies: (ctx) => canAccessEquipmentSupplies(ctx),
  admin: (ctx) =>
    ctx.accessLevel === AccessLevel.ADMIN ||
    ctx.accessLevel === AccessLevel.SUPER_ADMIN,
  managerApprovals: (ctx) => isManagerOrAbove(ctx.accessLevel),
};

const NAV_CATALOG: PortalNavItem[] = [
  { label: "Dashboard", href: "/staff-dashboard", feature: "dashboard" },
  { label: "Job Management", href: "/jobs", feature: "jobs" },
  { label: "Delivery", href: "/jobs/delivery", feature: "delivery" },
  { label: "Bin Management", href: "/jobs/bin-management", feature: "binManagement" },
  {
    label: "Equipment & Supplies",
    href: "/equipment-supplies",
    feature: "equipmentSupplies",
  },
  { label: "Human Resources", href: "/hr", feature: "humanResources" },
  {
    label: "Manager Approvals",
    href: "/manager/approvals",
    feature: "managerApprovals",
  },
  { label: "Admin", href: "/admin", feature: "admin" },
  { label: "My Profile", href: "/my-profile", feature: "myProfile" },
];

const PATH_RULES: { prefix: string; feature: PortalFeature }[] = [
  { prefix: "/manager", feature: "managerApprovals" },
  { prefix: "/admin", feature: "admin" },
  { prefix: "/jobs/bin-management", feature: "binManagement" },
  { prefix: "/jobs/delivery", feature: "delivery" },
  { prefix: "/hr/supervisor-reviews", feature: "supervisorTeamRequests" },
  { prefix: "/hr/organisation", feature: "hrOrganisation" },
  { prefix: "/equipment-supplies", feature: "equipmentSupplies" },
  { prefix: "/my-profile", feature: "myProfile" },
  { prefix: "/human-resources", feature: "humanResources" },
  { prefix: "/hr", feature: "humanResources" },
  { prefix: "/jobs", feature: "jobs" },
  { prefix: "/staff-dashboard", feature: "dashboard" },
  { prefix: "/staff", feature: "dashboard" },
  { prefix: "/policies", feature: "humanResources" },
  { prefix: "/notices", feature: "jobs" },
];

async function resolveEmployeeResponsibilities(employee: {
  id: string;
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
}): Promise<EmployeeResponsibility[]> {
  const entries = await prisma.employeeResponsibilityEntry.findMany({
    where: { employeeId: employee.id },
    select: { responsibility: true },
  });

  if (entries.length > 0) {
    return entries.map((entry) => entry.responsibility);
  }

  return getDefaultResponsibilitiesForLevel(
    employee.accessLevel,
    employee.operationalGroup,
  );
}

export async function toEmployeeAccessContext(employee: {
  id: string;
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  companyEmail: string;
  locationAssignment?: string | null;
}): Promise<EmployeeAccessContext> {
  const [assignments, responsibilities] = await Promise.all([
    resolveEmployeeJobAssignments(employee),
    resolveEmployeeResponsibilities(employee),
  ]);

  return createEmployeeAccessContext({
    accessLevel: employee.accessLevel,
    operationalGroup: employee.operationalGroup,
    responsibilities,
    assignments,
  });
}

export function canAccessPortalFeature(
  employee: EmployeeAccessContext,
  feature: PortalFeature,
): boolean {
  return FEATURE_ACCESS[feature](employee);
}

export function getVisibleNavItems(
  employee: EmployeeAccessContext,
): PortalNavItem[] {
  return NAV_CATALOG.filter((item) =>
    canAccessPortalFeature(employee, item.feature),
  );
}

export function resolvePortalFeature(pathname: string): PortalFeature | null {
  const path = pathname.split("?")[0] ?? pathname;

  for (const rule of PATH_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.feature;
    }
  }

  return null;
}

export function canAccessPathname(
  employee: EmployeeAccessContext,
  pathname: string,
): boolean {
  const feature = resolvePortalFeature(pathname);

  if (!feature) {
    return true;
  }

  return canAccessPortalFeature(employee, feature);
}

export const PORTAL_ACCESS_DENIED_REDIRECT = "/staff-dashboard";
