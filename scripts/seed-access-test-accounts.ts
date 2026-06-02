import { PrismaClient } from "@prisma/client";
import { seedAccessTestAccounts } from "../prisma/seed-access-test-accounts";

const prisma = new PrismaClient();

async function main() {
  await seedAccessTestAccounts(prisma);
  console.log("Access-level test accounts seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
