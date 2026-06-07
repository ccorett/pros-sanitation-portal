import { config } from "dotenv";
import { resolve } from "path";
import { canAccessDelivery } from "../src/lib/delivery-access";
import { listDeliveryRequestsForActor } from "../src/lib/delivery-request-service";
import {
  canAccessPathname,
  canAccessPortalFeature,
  getVisibleNavItems,
  toEmployeeAccessContext,
} from "../src/lib/portal-route-access";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const coordinator = await prisma.employee.findUnique({
    where: { companyEmail: "delivery.coordinator@prossanitation.com" },
  });

  if (!coordinator) {
    throw new Error("Delivery coordinator account not found.");
  }

  const ctx = await toEmployeeAccessContext(coordinator);
  const requests = await listDeliveryRequestsForActor(coordinator);

  const navLabels = getVisibleNavItems(ctx).map((item) => item.label);

  const checks = {
    responsibilities: ctx.responsibilities,
    canAccessDelivery: canAccessDelivery(ctx),
    deliveryFeature: canAccessPortalFeature(ctx, "delivery"),
    jobsFeature: canAccessPortalFeature(ctx, "jobs"),
    pathDelivery: canAccessPathname(ctx, "/jobs/delivery"),
    pathJobs: canAccessPathname(ctx, "/jobs"),
    canListRequests: Array.isArray(requests),
    navIncludesDelivery: navLabels.includes("Delivery"),
    requestCount: requests.length,
  };

  console.log(JSON.stringify(checks, null, 2));

  if (
    !checks.canAccessDelivery ||
    !checks.deliveryFeature ||
    !checks.pathDelivery ||
    !checks.canListRequests ||
    checks.navIncludesDelivery
  ) {
    throw new Error("Delivery coordinator access checks failed.");
  }

  console.log("Delivery coordinator access checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
