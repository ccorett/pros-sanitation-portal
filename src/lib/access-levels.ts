import { AccessLevel, AccountStatus } from "@prisma/client";

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  PENDING_VERIFICATION: "Pending Verification",
  TEAM_MEMBER: "Team Member",
  SUPERVISOR: "Supervisor",
  MANAGER: "Manager",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DISABLED: "Disabled",
  REMOVED: "Removed",
};

export function formatAccessLevelLabel(level: AccessLevel | string): string {
  return ACCESS_LEVEL_LABELS[level as AccessLevel] ?? String(level);
}

/** Position display/sync value — always matches access level (source of truth). */
export function derivePositionFromAccessLevel(level: AccessLevel): string {
  return formatAccessLevelLabel(level);
}

export function formatAccountStatusLabel(status: AccountStatus | string): string {
  return ACCOUNT_STATUS_LABELS[status as AccountStatus] ?? String(status);
}

export function isPendingVerificationEmployee(employee: {
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
}): boolean {
  return (
    employee.accessLevel === AccessLevel.PENDING_VERIFICATION ||
    employee.accountStatus === AccountStatus.PENDING
  );
}

export function canAccessStaffPortal(employee: {
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
}): boolean {
  return (
    employee.accountStatus === AccountStatus.ACTIVE &&
    employee.accessLevel !== AccessLevel.PENDING_VERIFICATION
  );
}

export function canAccessAdminModule(accessLevel: AccessLevel): boolean {
  return (
    accessLevel === AccessLevel.ADMIN ||
    accessLevel === AccessLevel.SUPER_ADMIN
  );
}

export function getPostLoginRedirect(employee: {
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
}): "/pending-verification" | "/staff-dashboard" {
  if (isPendingVerificationEmployee(employee)) {
    return "/pending-verification";
  }
  return "/staff-dashboard";
}
