import { AccessLevel, OperationalGroup } from "@prisma/client";
import { createEmployeeAccessContext } from "../src/lib/operational-access";
import {
  canAccessBinManagement,
  canManageBinLocationSetup,
  canPerformBinFieldUpdates,
} from "../src/lib/operational-access";
import {
  canAccessPathname,
  isKnownPortalPathname,
  isProtectedPortalPathname,
} from "../src/lib/portal-route-access";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function ctx(level: AccessLevel, group: OperationalGroup = OperationalGroup.GENERAL) {
  return createEmployeeAccessContext({ accessLevel: level, operationalGroup: group });
}

function main() {
  const unknownPaths = [
    "/admin/random",
    "/admin/test",
    "/manager/test",
    "/jobs/internal",
  ];

  for (const path of unknownPaths) {
    assert(isProtectedPortalPathname(path), `${path} should be protected`);
    assert(!isKnownPortalPathname(path), `${path} should be unknown`);
    assert(!canAccessPathname(ctx(AccessLevel.ADMIN), path), `${path} denied for admin`);
  }

  assert(canManageBinLocationSetup(AccessLevel.SUPER_ADMIN), "super admin setup");
  assert(canManageBinLocationSetup(AccessLevel.ADMIN), "admin setup");
  assert(canManageBinLocationSetup(AccessLevel.MANAGER), "manager setup");
  assert(!canManageBinLocationSetup(AccessLevel.SUPERVISOR), "supervisor no setup");
  assert(!canManageBinLocationSetup(AccessLevel.TEAM_MEMBER), "team member no setup");

  assert(canAccessBinManagement(ctx(AccessLevel.MANAGER)), "manager bin access");
  assert(
    canAccessBinManagement(
      ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.BIN_TECHNICIAN),
    ),
    "bin technician access",
  );
  assert(!canAccessBinManagement(ctx(AccessLevel.TEAM_MEMBER)), "team member denied");
  assert(!canAccessBinManagement(ctx(AccessLevel.SUPERVISOR)), "supervisor denied");

  assert(
    canPerformBinFieldUpdates(
      ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.BIN_TECHNICIAN),
    ),
    "bin technician field",
  );
  assert(
    canPerformBinFieldUpdates(
      ctx(AccessLevel.SUPERVISOR, OperationalGroup.BIN_SERVICE_SUPERVISOR),
    ),
    "bin supervisor field",
  );
  assert(!canPerformBinFieldUpdates(ctx(AccessLevel.TEAM_MEMBER)), "general team denied");

  console.log("Security hardening validation checks passed.");
}

main();
