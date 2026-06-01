-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "locationAssignment" TEXT;
