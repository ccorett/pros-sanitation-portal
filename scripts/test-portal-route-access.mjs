import { AccessLevel, OperationalGroup } from "@prisma/client";
import { EMPTY_JOB_ASSIGNMENTS } from "../src/lib/employee-job-assignments.ts";
import { createEmployeeAccessContext } from "../src/lib/operational-access.ts";
import {
  canAccessPathname,
  canAccessPortalFeature,
  getVisibleNavItems,
} from "../src/lib/portal-route-access.ts";

function ctx(level, group = OperationalGroup.GENERAL, assignments = EMPTY_JOB_ASSIGNMENTS) {
  return createEmployeeAccessContext({
    accessLevel: level,
    operationalGroup: group,
    assignments,
  });
}

const cases = [
  {
    employee: ctx(AccessLevel.TEAM_MEMBER),
    allow: ["/staff-dashboard", "/jobs", "/hr", "/my-profile"],
    deny: ["/equipment-supplies", "/admin", "/manager/approvals", "/jobs/bin-management"],
    nav: ["Dashboard", "Jobs", "Human Resources", "My Profile"],
    absentNav: ["Bin Management", "Team Requests", "Equipment & Supplies"],
  },
  {
    employee: ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.BIN_TECHNICIAN),
    allow: ["/jobs/bin-management", "/jobs/bin-management/today", "/hr"],
    deny: ["/jobs", "/equipment-supplies", "/admin"],
    nav: ["Dashboard", "Bin Management", "Human Resources", "My Profile"],
    absentNav: ["Jobs", "Equipment & Supplies", "Team Requests"],
  },
  {
    employee: ctx(
      AccessLevel.TEAM_MEMBER,
      OperationalGroup.BIN_TECHNICIAN,
      {
        assignedJobIds: [],
        assignedLocationIds: ["scarborough-pennysaver-grocery"],
        assignedBinManagement: false,
      },
    ),
    allow: ["/jobs", "/jobs/scarborough-pennysaver-grocery"],
    nav: ["Jobs"],
  },
  {
    employee: ctx(AccessLevel.SUPERVISOR),
    allow: ["/equipment-supplies", "/hr/supervisor-reviews", "/jobs"],
    deny: ["/admin", "/manager/approvals", "/jobs/bin-management"],
    nav: ["Jobs", "Equipment & Supplies", "Team Requests"],
    absentNav: ["Bin Management"],
  },
  {
    employee: ctx(AccessLevel.SUPERVISOR, OperationalGroup.BIN_SERVICE_SUPERVISOR),
    allow: ["/jobs/bin-management", "/equipment-supplies"],
    deny: ["/jobs"],
    nav: ["Dashboard", "Bin Management", "Equipment & Supplies", "Human Resources", "My Profile"],
    absentNav: ["Jobs"],
  },
  {
    employee: ctx(
      AccessLevel.SUPERVISOR,
      OperationalGroup.BIN_SERVICE_SUPERVISOR,
      {
        assignedJobIds: [],
        assignedLocationIds: ["canaan-pennysaver-grocery"],
        assignedBinManagement: false,
      },
    ),
    allow: ["/jobs"],
    nav: ["Jobs"],
  },
  {
    employee: ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.GENERAL, {
      ...EMPTY_JOB_ASSIGNMENTS,
      assignedBinManagement: true,
    }),
    allow: ["/jobs/bin-management"],
    nav: ["Bin Management"],
  },
  {
    employee: ctx(AccessLevel.MANAGER),
    allow: ["/manager/approvals", "/jobs/bin-management", "/jobs"],
    nav: ["Manager Approvals", "Bin Management", "Jobs"],
  },
];

let failed = 0;

for (const test of cases) {
  for (const path of test.allow) {
    if (!canAccessPathname(test.employee, path)) {
      console.error(`FAIL should access ${path}`);
      failed += 1;
    }
  }
  for (const path of test.deny ?? []) {
    if (canAccessPathname(test.employee, path)) {
      console.error(`FAIL should NOT access ${path}`);
      failed += 1;
    }
  }
  const labels = getVisibleNavItems(test.employee).map((item) => item.label);
  for (const label of test.nav) {
    if (!labels.includes(label)) {
      console.error(`FAIL nav missing ${label}: ${labels.join(", ")}`);
      failed += 1;
    }
  }
  for (const label of test.absentNav ?? []) {
    if (labels.includes(label)) {
      console.error(`FAIL nav should hide ${label}: ${labels.join(", ")}`);
      failed += 1;
    }
  }
}

if (
  !canAccessPortalFeature(
    ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.BIN_TECHNICIAN),
    "binManagement",
  ) ||
  canAccessPortalFeature(
    ctx(AccessLevel.TEAM_MEMBER, OperationalGroup.BIN_TECHNICIAN),
    "jobs",
  )
) {
  console.error("FAIL bin technician feature matrix");
  failed += 1;
}

if (failed > 0) {
  process.exit(1);
}

console.log("portal-route-access checks passed");
