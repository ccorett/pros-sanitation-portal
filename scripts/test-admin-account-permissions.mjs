import { AccessLevel, AccountStatus } from "@prisma/client";
import {
  canAdminManageTarget,
  canAssignAccessLevel,
  canPerformAccountAction,
  getAssignableAccessLevels,
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
  !canAdminManageTarget(admin, AccessLevel.ADMIN),
  "admin cannot manage admin",
);
assert(
  !canAdminManageTarget(admin, AccessLevel.SUPER_ADMIN),
  "admin cannot manage super admin",
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
  !canAssignAccessLevel(admin, AccessLevel.ADMIN),
  "admin cannot assign admin",
);
assert(
  canAssignAccessLevel(admin, AccessLevel.TEAM_MEMBER),
  "admin can assign team member",
);
assert(
  canAssignAccessLevel(superAdmin, AccessLevel.SUPER_ADMIN),
  "super admin can assign super admin",
);

assert(
  getAssignableAccessLevels(admin).length === 3,
  "admin gets three assignable levels",
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
    AccessLevel.ADMIN,
    AccountStatus.ACTIVE,
    "remove",
  ),
  "admin cannot remove admin",
);
assert(
  canPerformAccountAction(
    superAdmin,
    AccessLevel.ADMIN,
    AccountStatus.ACTIVE,
    "remove",
  ),
  "super admin can remove admin",
);

if (failed > 0) {
  process.exit(1);
}

console.log("admin-account-permissions checks passed");
