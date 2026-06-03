import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

try {
  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, applied_steps_count
     FROM _prisma_migrations
     ORDER BY finished_at`,
  );

  console.log("=== _prisma_migrations ===");
  for (const row of migrations) {
    console.log(
      `${row.migration_name} | steps=${row.applied_steps_count} | finished=${row.finished_at?.toISOString() ?? "null"}`,
    );
  }

  const columns = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_name = 'employees'
       AND column_name IN ('accessLevel', 'operationalGroup')
     ORDER BY column_name`,
  );

  console.log("\n=== employees columns ===");
  for (const row of columns) {
    console.log(`${row.column_name}: ${row.data_type} (${row.udt_name})`);
  }

  const types = await prisma.$queryRawUnsafe(
    `SELECT typname FROM pg_type WHERE typname IN ('PortalAccessLevel', 'OperationalGroup') ORDER BY typname`,
  );

  const failed = await prisma.$queryRawUnsafe(
    `SELECT migration_name, started_at, finished_at, applied_steps_count, logs
     FROM _prisma_migrations
     WHERE migration_name = '20260520120000_employee_access_levels'`,
  );
  console.log("\n=== failed migration detail ===");
  console.log(JSON.stringify(failed, null, 2));
} finally {
  await prisma.$disconnect();
}
