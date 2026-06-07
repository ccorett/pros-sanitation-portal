import { config } from "dotenv";
import { resolve } from "path";
import { purgeExpiredRemovedAccounts } from "../src/lib/account-retention";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const result = await purgeExpiredRemovedAccounts();
  console.log(
    JSON.stringify(
      {
        purged: result.purged,
        employeeIds: result.employeeIds,
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
