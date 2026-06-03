import { PrismaClient } from "@prisma/client";
import {
  DEMO_VACATION_REQUEST_ID,
  seedDemoVacationRequest,
} from "../src/lib/vacation-request-service";

const prisma = new PrismaClient();

async function main() {
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });

  if (!teamMember) {
    throw new Error("team.member@prossanitation.com not found.");
  }

  await seedDemoVacationRequest(teamMember);

  const demo = await prisma.vacationRequest.findUnique({
    where: { id: DEMO_VACATION_REQUEST_ID },
  });

  console.log(
    demo
      ? `Demo vacation seeded: ${demo.id} · ${demo.finalStatus} · ${demo.reason}`
      : "Demo vacation missing after seed.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
