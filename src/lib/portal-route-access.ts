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
import { hasAdminAssistantResponsibility } from "@/lib/invoice-access";
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
  | "managerApprovals"
  | "payslipAdministration"
  | "stockManagement"
  | "teamCheckIn"
  | "invoiceManagement"
  | "adminHub";

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
  adminHub: (ctx) =>
    canAccessAdminModule(ctx.accessLevel) || hasAdminAssistantResponsibility(ctx),
  invoiceManagement: (ctx) =>
    canAccessAdminModule(ctx.accessLevel) || hasAdminAssistantResponsibility(ctx),
  managerApprovals: (ctx) => isManagerOrAbove(ctx.accessLevel),
  payslipAdministration: (ctx) => isManagerOrAbove(ctx.accessLevel),
  stockManagement: (ctx) => isManagerOrAbove(ctx.accessLevel),
  teamCheckIn: (ctx) =>
    ctx.accessLevel === AccessLevel.SUPERVISOR || isManagerOrAbove(ctx.accessLevel),
};

const NAV_CATALOG: PortalNavItem[] = [
  { label: "Dashboard", href: "/staff-dashboard", feature: "dashboard" },
  { label: "Work Locations", href: "/jobs", feature: "jobs" },
  { label: "Bin Management", href: "/jobs/bin-management", feature: "binManagement" },
  {
    label: "Equipment & Supplies",
    href: "/equipment-supplies",
    feature: "equipmentSupplies",
  },
  { label: "Human Resources", href: "/hr", feature: "humanResources" },
  {
    label: "Manager Approval",
    href: "/manager/approvals",
    feature: "managerApprovals",
  },
  { label: "Admin", href: "/admin", feature: "adminHub" },
  { label: "My Profile", href: "/my-profile", feature: "myProfile" },
];

/** Session-required prefixes aligned with middleware protected paths. */
export const PROTECTED_PORTAL_PATH_PREFIXES = [
  "/pending-verification",
  "/staff-dashboard",
  "/staff",
  "/jobs",
  "/hr",
  "/human-resources",
  "/equipment-supplies",
  "/my-profile",
  "/admin",
  "/manager",
  "/policies",
  "/notices",
] as const;

/** Protected paths that are valid but not mapped to a portal feature. */
const KNOWN_PROTECTED_PATHS_WITHOUT_FEATURE = ["/pending-verification"] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PathRule = {
  prefix: string;
  feature: PortalFeature;
  /** Hub roots match only the exact path, not unknown nested segments. */
  exact?: boolean;
};

const PATH_RULES: PathRule[] = [
  { prefix: "/admin/invoices", feature: "invoiceManagement" },
  { prefix: "/admin/accounts", feature: "admin" },
  { prefix: "/admin/approvals", feature: "admin" },
  { prefix: "/admin/bin-services", feature: "admin" },
  { prefix: "/admin/human-resources", feature: "admin" },
  { prefix: "/admin/policies", feature: "admin" },
  { prefix: "/admin/stock-management", feature: "stockManagement" },
  { prefix: "/admin/purchasing-list", feature: "stockManagement" },
  { prefix: "/admin", feature: "adminHub", exact: true },
  { prefix: "/manager/approvals", feature: "managerApprovals" },
  { prefix: "/jobs/bin-management", feature: "binManagement" },
  { prefix: "/jobs/team-check-in", feature: "teamCheckIn" },
  { prefix: "/jobs/delivery", feature: "delivery" },
  { prefix: "/hr/payslip-administration", feature: "payslipAdministration" },
  { prefix: "/hr/supervisor-reviews", feature: "supervisorTeamRequests" },
  { prefix: "/hr/organisation", feature: "hrOrganisation" },
  { prefix: "/equipment-supplies", feature: "equipmentSupplies" },
  { prefix: "/my-profile", feature: "myProfile" },
  { prefix: "/human-resources", feature: "humanResources" },
  { prefix: "/hr", feature: "humanResources" },
  { prefix: "/jobs", feature: "jobs", exact: true },
  { prefix: "/staff-dashboard", feature: "dashboard" },
  { prefix: "/staff", feature: "dashboard" },
  { prefix: "/policies", feature: "humanResources" },
  { prefix: "/notices", feature: "jobs" },
];

function matchesPathRule(path: string, rule: PathRule): boolean {
  if (rule.exact) {
    return path === rule.prefix;
  }

  return path === rule.prefix || path.startsWith(`${rule.prefix}/`);
}

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

function normalizePathname(pathname: string): string {
  return pathname.split("?")[0] ?? pathname;
}

export function isProtectedPortalPathname(pathname: string): boolean {
  const path = normalizePathname(pathname);

  return PROTECTED_PORTAL_PATH_PREFIXES.some((prefix) => {
    if (prefix === "/staff") {
      return path === "/staff" || path.startsWith("/staff/");
    }

    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export function resolvePortalFeature(pathname: string): PortalFeature | null {
  const path = normalizePathname(pathname);

  for (const rule of PATH_RULES) {
    if (matchesPathRule(path, rule)) {
      return rule.feature;
    }
  }

  const jobDetailMatch = path.match(/^\/jobs\/([^/]+)$/);
  if (jobDetailMatch?.[1] && UUID_PATTERN.test(jobDetailMatch[1])) {
    return "jobs";
  }

  return null;
}

export function isKnownPortalPathname(pathname: string): boolean {
  const path = normalizePathname(pathname);

  if (
    KNOWN_PROTECTED_PATHS_WITHOUT_FEATURE.some(
      (knownPath) =>
        path === knownPath || path.startsWith(`${knownPath}/`),
    )
  ) {
    return true;
  }

  return resolvePortalFeature(path) !== null;
}

export function canAccessPathname(
  employee: EmployeeAccessContext,
  pathname: string,
): boolean {
  const path = normalizePathname(pathname);

  if (!isProtectedPortalPathname(path)) {
    return true;
  }

  const feature = resolvePortalFeature(path);

  if (!feature) {
    return false;
  }

  return canAccessPortalFeature(employee, feature);
}

export const PORTAL_ACCESS_DENIED_REDIRECT = "/staff-dashboard";
