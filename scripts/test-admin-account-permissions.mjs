import { AccessLevel, AccountStatus } from "@prisma/client";
import {
  canAdminManageTarget,
  canAssignAccessLevel,
  canPerformAccountAction,
  getAssignableAccessLevels,
  isSuperAdminProtectedTarget,
} from "../src/lib/admin-account-permissions.ts";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed += 1;
  }
}

const admin = AccessLevel.ADMIN;
const superAdmin = AccessLevel.SUPER_ADMIN;

assert(
  isSuperAdminProtectedTarget(superAdmin),
  "super admin target is protected",
);
assert(
  !isSuperAdminProtectedTarget(admin),
  "admin target is not super-admin protected",
);

assert(
  !canAdminManageTarget(admin, AccessLevel.ADMIN),
  "admin cannot manage admin",
);
assert(
  canAdminManageTarget(superAdmin, AccessLevel.SUPER_ADMIN),
  "super admin can view/manage super admin target scope",
);
assert(
  canAdminManageTarget(admin, AccessLevel.MANAGER),
  "admin can manage manager",
);
assert(
  canAdminManageTarget(superAdmin, AccessLevel.ADMIN),
  "super admin can manage admin",
);

assert(
  !canAssignAccessLevel(admin, AccessLevel.SUPER_ADMIN),
  "admin cannot assign super admin",
);
assert(
  !canAssignAccessLevel(superAdmin, AccessLevel.SUPER_ADMIN),
  "super admin cannot assign super admin via platform",
);
assert(
  !canAssignAccessLevel(admin, AccessLevel.ADMIN),
  "admin cannot assign admin",
);
assert(
  canAssignAccessLevel(admin, AccessLevel.TEAM_MEMBER),
  "admin can assign team member",
);
assert(
  canAssignAccessLevel(superAdmin, AccessLevel.ADMIN),
  "super admin can assign admin",
);

assert(
  getAssignableAccessLevels(admin).length === 3,
  "admin gets three assignable levels",
);
assert(
  !getAssignableAccessLevels(superAdmin).includes(AccessLevel.SUPER_ADMIN),
  "super admin assignable levels exclude super admin",
);

assert(
  canPerformAccountAction(
    admin,
    AccessLevel.PENDING_VERIFICATION,
    AccountStatus.PENDING,
    "approve",
  ),
  "admin can approve pending",
);
assert(
  !canPerformAccountAction(
    admin,
    AccessLevel.SUPER_ADMIN,
    AccountStatus.ACTIVE,
    "changeAccessLevel",
  ),
  "admin cannot change super admin level",
);
assert(
  !canPerformAccountAction(
    superAdmin,
    AccessLevel.SUPER_ADMIN,
    AccountStatus.ACTIVE,
    "changeAccessLevel",
  ),
  "super admin cannot change super admin level",
);
assert(
  !canPerformAccountAction(
    superAdmin,
    AccessLevel.SUPER_ADMIN,
    AccountStatus.ACTIVE,
    "disable",
  ),
  "super admin cannot disable super admin",
);
assert(
  !canPerformAccountAction(
    superAdmin,
    AccessLevel.SUPER_ADMIN,
    AccountStatus.ACTIVE,
    "deleteAccount",
  ),
  "super admin cannot delete super admin",
);
assert(
  canPerformAccountAction(
    superAdmin,
    AccessLevel.ADMIN,
    AccountStatus.ACTIVE,
    "deleteAccount",
  ),
  "super admin can delete admin with PIN flow",
);
assert(
  !canPerformAccountAction(
    admin,
    AccessLevel.TEAM_MEMBER,
    AccountStatus.ACTIVE,
    "deleteAccount",
  ),
  "admin cannot delete accounts",
);

if (failed > 0) {
  process.exit(1);
}

console.log("admin-account-permissions checks passed");
