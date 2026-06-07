import { config } from "dotenv";
import { resolve } from "path";
import { canAccessDelivery } from "../src/lib/delivery-access";
import {
  createDeliveryRequest,
  listDeliveryRequestsForActor,
  updateDeliveryRequest,
} from "../src/lib/delivery-request-service";
import { canAccessPortalFeature, toEmployeeAccessContext } from "../src/lib/portal-route-access";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const kurt = await prisma.employee.findUnique({
    where: { companyEmail: "kurt.allong@prossanitation.com" },
  });
  const manager = await prisma.employee.findUnique({
    where: { companyEmail: "manager@prossanitation.com" },
  });
  const teamMember = await prisma.employee.findUnique({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  const supervisor = await prisma.employee.findUnique({
    where: { companyEmail: "supervisor@prossanitation.com" },
  });

  if (!kurt || !manager || !teamMember || !supervisor) {
    throw new Error("Missing seeded Kurt, manager, team member, or supervisor.");
  }

  const kurtContext = await toEmployeeAccessContext(kurt);
  const teamContext = await toEmployeeAccessContext(teamMember);
  const supervisorContext = await toEmployeeAccessContext(supervisor);

  if (!canAccessDelivery(kurtContext)) {
    throw new Error("Kurt should have delivery access.");
  }
  if (!canAccessPortalFeature(kurtContext, "equipmentSupplies")) {
    throw new Error("Kurt should see Equipment & Supplies.");
  }
  if (canAccessPortalFeature(kurtContext, "admin")) {
    throw new Error("Kurt should not see Admin.");
  }
  if (canAccessDelivery(teamContext)) {
    throw new Error("General team member should not have delivery access.");
  }
  if (canAccessDelivery(supervisorContext)) {
    throw new Error("General supervisor should not have delivery access.");
  }

  const created = await createDeliveryRequest(manager, {
    items: [{ itemName: "Degreaser 5L", quantity: 2 }],
    requestedByName: "Operations Manager",
    requestedByEmail: manager.companyEmail,
    requestingLocation: "Scarborough Pennysaver Grocery",
    responsibleSupervisorName: "Field Supervisor",
    priority: "HIGH",
    notes: "Delivery flow test",
  });

  const assigned = await updateDeliveryRequest(manager, created.id, {
    action: "assignDriver",
    assignedDriverId: kurt.id,
    notes: "Assigned to Kurt for test run",
  });

  if (assigned.assignedDriverId !== kurt.id) {
    throw new Error("Driver assignment failed.");
  }

  const kurtView = await listDeliveryRequestsForActor(kurt);
  const kurtRequest = kurtView.find((row) => row.id === created.id);
  if (!kurtRequest) {
    throw new Error("Kurt could not see assigned delivery.");
  }

  const fulfilled = await updateDeliveryRequest(kurt, created.id, {
    action: "updateStatus",
    status: "FULFILLED",
    notes: "Delivered to site",
  });

  const managerView = await listDeliveryRequestsForActor(manager);
  const managerRequest = managerView.find((row) => row.id === created.id);

  console.log(
    JSON.stringify(
      {
        requestNumber: created.requestNumber,
        assignedStatus: assigned.status,
        kurtSeesAssigned: Boolean(kurtRequest),
        fulfilledStatus: fulfilled.status,
        managerSeesFulfilled: managerRequest?.status,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
