import { AccessLevel, OperationalGroup } from "@prisma/client";
import { createEmployeeAccessContext } from "../src/lib/operational-access";
import {
  canAccessPathname,
  isKnownPortalPathname,
  isProtectedPortalPathname,
  resolvePortalFeature,
} from "../src/lib/portal-route-access";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildContext(accessLevel: AccessLevel) {
  return createEmployeeAccessContext({
    accessLevel,
    operationalGroup: OperationalGroup.GENERAL,
  });
}

function main() {
  const unknownProtectedPaths = [
    "/admin/random-test",
    "/manager/random-test",
    "/jobs/random-test",
  ];

  const knownPaths = [
    "/admin",
    "/admin/accounts",
    "/admin/stock-management",
    "/manager/approvals",
    "/jobs",
    "/jobs/bin-management",
    "/staff-dashboard",
    "/pending-verification",
  ];

  for (const path of unknownProtectedPaths) {
    assert(isProtectedPortalPathname(path), `${path} should be protected`);
    assert(!isKnownPortalPathname(path), `${path} should be unknown`);
    assert(resolvePortalFeature(path) === null, `${path} should have no feature`);

    for (const level of [
      AccessLevel.SUPER_ADMIN,
      AccessLevel.ADMIN,
      AccessLevel.MANAGER,
    ]) {
      assert(
        !canAccessPathname(buildContext(level), path),
        `${level} should be denied for ${path}`,
      );
    }
  }

  for (const path of knownPaths) {
    assert(isKnownPortalPathname(path), `${path} should be known`);
    assert(
      resolvePortalFeature(path) !== null || path === "/pending-verification",
      `${path} should resolve to a feature or be pending verification`,
    );
  }

  assert(
    resolvePortalFeature("/admin/stock-management") === "stockManagement",
    "/admin/stock-management must match stockManagement before admin hub",
  );
  assert(
    resolvePortalFeature("/manager/approvals") === "managerApprovals",
    "/manager/approvals must resolve to managerApprovals",
  );

  assert(!isProtectedPortalPathname("/employee-login"), "login stays public");
  assert(isKnownPortalPathname("/employee-login") === false, "login is not a portal route");

  console.log("Route access fail-closed checks passed.");
}

main();
