import { config } from "dotenv";
import { resolve } from "path";
import { getDashboardSummary } from "../src/lib/dashboard-summary-service";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function loadEmployee(email: string) {
  const employee = await prisma.employee.findUnique({
    where: { companyEmail: email },
  });
  if (!employee) {
    throw new Error(`Missing seed account: ${email}`);
  }
  return employee;
}

function labels(items: { label: string }[] | null): string[] {
  return (items ?? []).map((item) => item.label);
}

async function main() {
  const kurt = await loadEmployee("kurt.allong@prossanitation.com");
  const coordinator = await loadEmployee("delivery.coordinator@prossanitation.com");
  const manager = await loadEmployee("manager@prossanitation.com");
  const teamMember = await loadEmployee("team.member@prossanitation.com");

  const [kurtSummary, coordinatorSummary, managerSummary, teamSummary] =
    await Promise.all([
      getDashboardSummary(kurt),
      getDashboardSummary(coordinator),
      getDashboardSummary(manager),
      getDashboardSummary(teamMember),
    ]);

  const kurtLabels = labels(kurtSummary.deliveryActivity);
  const coordinatorLabels = labels(coordinatorSummary.deliveryActivity);
  const managerLabels = labels(managerSummary.deliveryActivity);

  const kurtOk =
    kurtLabels.length === 2 &&
    kurtLabels.includes("Assigned Delivery Requests") &&
    kurtLabels.includes("Deliveries In Progress");

  const coordinatorOk =
    coordinatorLabels.length === 3 &&
    coordinatorLabels.includes("Open Delivery Requests") &&
    coordinatorLabels.includes("Deliveries Awaiting Assignment") &&
    coordinatorLabels.includes("Deliveries In Progress");

  const managerOk =
    managerLabels.length === 3 &&
    managerLabels.includes("Open Delivery Requests") &&
    managerLabels.includes("Deliveries In Progress") &&
    managerLabels.includes("Completed Deliveries Today");

  const teamMemberOk = teamSummary.deliveryActivity === null;

  console.log(
    JSON.stringify(
      {
        kurt: { labels: kurtLabels, counts: kurtSummary.deliveryActivity, ok: kurtOk },
        coordinator: {
          labels: coordinatorLabels,
          counts: coordinatorSummary.deliveryActivity,
          ok: coordinatorOk,
        },
        manager: {
          labels: managerLabels,
          counts: managerSummary.deliveryActivity,
          ok: managerOk,
        },
        teamMember: {
          deliveryActivity: teamSummary.deliveryActivity,
          ok: teamMemberOk,
        },
      },
      null,
      2,
    ),
  );

  if (!kurtOk || !coordinatorOk || !managerOk || !teamMemberOk) {
    throw new Error("Dashboard delivery activity visibility checks failed.");
  }

  console.log("Dashboard delivery activity checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
