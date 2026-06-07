import { AccessLevel, AccountStatus } from "@prisma/client";

const LEVEL_RANK: Record<AccessLevel, number> = {
  PENDING_VERIFICATION: 0,
  TEAM_MEMBER: 1,
  SUPERVISOR: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export type AdminAccountAction =
  | "view"
  | "approve"
  | "changeAccessLevel"
  | "editWorkProfile"
  | "changeResponsibilities"
  | "disable"
  | "deleteAccount"
  | "viewHistory";

export function isAdminOrSuperAdmin(level: AccessLevel): boolean {
  return level === AccessLevel.ADMIN || level === AccessLevel.SUPER_ADMIN;
}

export function isSuperAdminLevel(level: AccessLevel): boolean {
  return level === AccessLevel.SUPER_ADMIN;
}

export function isSuperAdminProtectedTarget(targetLevel: AccessLevel): boolean {
  return targetLevel === AccessLevel.SUPER_ADMIN;
}

export function isProtectedFromAdminEditor(targetLevel: AccessLevel): boolean {
  return targetLevel === AccessLevel.ADMIN || targetLevel === AccessLevel.SUPER_ADMIN;
}

export function canAdminManageTarget(
  actorLevel: AccessLevel,
  targetLevel: AccessLevel,
): boolean {
  if (isSuperAdminProtectedTarget(targetLevel)) {
    return actorLevel === AccessLevel.SUPER_ADMIN;
  }

  if (actorLevel === AccessLevel.SUPER_ADMIN) {
    return true;
  }

  if (actorLevel !== AccessLevel.ADMIN) {
    return false;
  }

  if (isProtectedFromAdminEditor(targetLevel)) {
    return false;
  }

  return LEVEL_RANK[targetLevel] < LEVEL_RANK[AccessLevel.ADMIN];
}

export function getAssignableAccessLevels(actorLevel: AccessLevel): AccessLevel[] {
  if (actorLevel === AccessLevel.SUPER_ADMIN) {
    return [
      AccessLevel.TEAM_MEMBER,
      AccessLevel.SUPERVISOR,
      AccessLevel.MANAGER,
      AccessLevel.ADMIN,
    ];
  }

  if (actorLevel === AccessLevel.ADMIN) {
    return [
      AccessLevel.TEAM_MEMBER,
      AccessLevel.SUPERVISOR,
      AccessLevel.MANAGER,
    ];
  }

  return [];
}

export function canAssignAccessLevel(
  actorLevel: AccessLevel,
  newLevel: AccessLevel,
): boolean {
  if (newLevel === AccessLevel.SUPER_ADMIN) {
    return false;
  }

  if (actorLevel === AccessLevel.SUPER_ADMIN) {
    return newLevel !== AccessLevel.PENDING_VERIFICATION;
  }

  if (actorLevel === AccessLevel.ADMIN) {
    return getAssignableAccessLevels(actorLevel).includes(newLevel);
  }

  return false;
}

export function canPerformAccountAction(
  actorLevel: AccessLevel,
  targetLevel: AccessLevel,
  targetStatus: AccountStatus,
  action: AdminAccountAction,
): boolean {
  if (!isAdminOrSuperAdmin(actorLevel)) {
    return false;
  }

  if (action === "view" || action === "viewHistory") {
    return (
      canAdminManageTarget(actorLevel, targetLevel) ||
      actorLevel === AccessLevel.SUPER_ADMIN
    );
  }

  if (isSuperAdminProtectedTarget(targetLevel)) {
    if (action === "editWorkProfile") {
      return actorLevel === AccessLevel.SUPER_ADMIN;
    }

    return false;
  }

  if (!canAdminManageTarget(actorLevel, targetLevel)) {
    return false;
  }

  if (action === "approve") {
    return (
      targetStatus === AccountStatus.PENDING ||
      targetLevel === AccessLevel.PENDING_VERIFICATION
    );
  }

  if (action === "changeAccessLevel") {
    return targetStatus !== AccountStatus.REMOVED;
  }

  if (action === "editWorkProfile" || action === "changeResponsibilities") {
    return targetStatus !== AccountStatus.REMOVED;
  }

  if (action === "disable") {
    return targetStatus === AccountStatus.ACTIVE || targetStatus === AccountStatus.PENDING;
  }

  if (action === "deleteAccount") {
    return (
      actorLevel === AccessLevel.SUPER_ADMIN &&
      targetStatus !== AccountStatus.REMOVED
    );
  }

  return false;
}

export function defaultApprovalAccessLevel(): AccessLevel {
  return AccessLevel.TEAM_MEMBER;
}
