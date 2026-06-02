-- CreateEnum
CREATE TYPE "OperationalGroup" AS ENUM ('GENERAL', 'BIN_TECHNICIAN', 'BIN_SERVICE_SUPERVISOR');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "operationalGroup" "OperationalGroup" NOT NULL DEFAULT 'GENERAL';
