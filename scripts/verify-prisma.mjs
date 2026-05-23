import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

try {
  const [employees, jobs, notices, policies] = await Promise.all([
    prisma.employee.count(),
    prisma.job.count(),
    prisma.internalNotice.count(),
    prisma.policy.count(),
  ]);

  console.log("OK: Prisma connected to Neon");
  console.log(
    JSON.stringify({ employees, jobs, notices, policies }, null, 2),
  );
} catch (error) {
  console.error("FAIL: Prisma could not query Neon");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
