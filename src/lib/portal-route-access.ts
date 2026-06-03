import { AccessLevel, OperationalGroup } from "@prisma/client";
import { canAccessGeneralJobs } from "@/lib/job-assignment-access";
import { resolveEmployeeJobAssignments } from "@/lib/job-assignment-service";
import {
  canAccessBinManagement,
  canAccessEquipmentSupplies,
  createEmployeeAccessContext,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";

export type PortalFeature =
  | "dashboard"
  | "jobs"
  | "binManagement"
  | "humanResources"
  | "supervisorTeamRequests"
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
  binManagement: (ctx) => canAccessBinManagement(ctx),
  humanResources: (ctx) =>
    ctx.accessLevel !== AccessLevel.PENDING_VERIFICATION,
  supervisorTeamRequests: (ctx) =>
    ctx.accessLevel === AccessLevel.SUPERVISOR &&
    ctx.operationalGroup !== OperationalGroup.BIN_TECHNICIAN,
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
  { label: "Jobs", href: "/jobs", feature: "jobs" },
  { label: "Bin Management", href: "/jobs/bin-management", feature: "binManagement" },
  {
    label: "Equipment & Supplies",
    href: "/equipment-supplies",
    feature: "equipmentSupplies",
  },
  { label: "Human Resources", href: "/hr", feature: "humanResources" },
  {
    label: "Team Requests",
    href: "/hr/supervisor-reviews",
    feature: "supervisorTeamRequests",
  },
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
  { prefix: "/hr/supervisor-reviews", feature: "supervisorTeamRequests" },
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

export async function toEmployeeAccessContext(employee: {
  id: string;
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  companyEmail: string;
}): Promise<EmployeeAccessContext> {
  const assignments = await resolveEmployeeJobAssignments(employee);

  return createEmployeeAccessContext({
    accessLevel: employee.accessLevel,
    operationalGroup: employee.operationalGroup,
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
