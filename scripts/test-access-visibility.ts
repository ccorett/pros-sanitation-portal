import { AccessLevel } from "@prisma/client";
import { getDashboardSummary } from "../src/lib/dashboard-summary-service";
import { listEquipmentRequestsForActor } from "../src/lib/equipment-request-service";
import { prisma } from "../src/lib/prisma";
import { getSupervisorVisibleEmployeeIds } from "../src/lib/supervisor-team-scope";
import { listVacationRequestsForActor } from "../src/lib/vacation-request-service";

async function loadEmployee(email: string) {
  const employee = await prisma.employee.findFirst({
    where: { companyEmail: email },
  });
  if (!employee) {
    throw new Error(`Missing seed account: ${email}`);
  }
  return employee;
}

async function main() {
  const teamMember = await loadEmployee("team.member@prossanitation.com");
  const supervisor = await loadEmployee("supervisor@prossanitation.com");
  const manager = await loadEmployee("manager@prossanitation.com");

  const teamVacations = await listVacationRequestsForActor(teamMember);
  const teamEquipment = await listEquipmentRequestsForActor(teamMember);
  const teamDashboard = await getDashboardSummary(teamMember);

  const supervisorScope = await getSupervisorVisibleEmployeeIds(supervisor);
  const supervisorVacations = await listVacationRequestsForActor(supervisor);
  const supervisorEquipment = await listEquipmentRequestsForActor(supervisor);
  const supervisorDashboard = await getDashboardSummary(supervisor);

  const managerVacations = await listVacationRequestsForActor(manager);
  const managerDashboard = await getDashboardSummary(manager);

  const teamMemberOnlyOwnVacations = teamVacations.every(
    (row) => row.employeeId === teamMember.id,
  );
  const teamMemberOnlyOwnEquipment = teamEquipment.every(
    (row) => row.requestedById === teamMember.id,
  );

  const supervisorSeesOnlyLocationTeam = supervisorVacations.every((row) =>
    supervisorScope.includes(row.employeeId),
  );
  const supervisorEquipmentScoped = supervisorEquipment.every((row) =>
    supervisorScope.includes(row.requestedById),
  );
  const supervisorNotGlobal =
    supervisor.accessLevel === AccessLevel.SUPERVISOR &&
    supervisorVacations.length <= supervisorScope.length + 2;

  const managerSeesBroaderDashboard =
    managerDashboard.metrics.pendingVacationRequests >=
    teamDashboard.metrics.pendingVacationRequests;

  console.log("team.member vacation rows:", teamVacations.length, teamMemberOnlyOwnVacations);
  console.log("team.member equipment rows:", teamEquipment.length, teamMemberOnlyOwnEquipment);
  console.log("supervisor scope ids:", supervisorScope.length);
  console.log("supervisor vacation scoped:", supervisorSeesOnlyLocationTeam, supervisorNotGlobal);
  console.log("supervisor equipment scoped:", supervisorEquipmentScoped);
  console.log("manager vacation rows:", managerVacations.length);
  console.log("manager broader dashboard:", managerSeesBroaderDashboard);

  if (
    !teamMemberOnlyOwnVacations ||
    !teamMemberOnlyOwnEquipment ||
    !supervisorSeesOnlyLocationTeam ||
    !supervisorEquipmentScoped ||
    !managerSeesBroaderDashboard
  ) {
    process.exit(1);
  }

  console.log("Access visibility checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
