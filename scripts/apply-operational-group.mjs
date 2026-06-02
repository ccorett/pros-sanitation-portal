import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "OperationalGroup" AS ENUM ('GENERAL', 'BIN_TECHNICIAN', 'BIN_SERVICE_SUPERVISOR');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "employees"
    ADD COLUMN IF NOT EXISTS "operationalGroup" "OperationalGroup" NOT NULL DEFAULT 'GENERAL';
  `);

  console.log("OK: operationalGroup column ready");
} catch (error) {
  console.error("FAIL:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
