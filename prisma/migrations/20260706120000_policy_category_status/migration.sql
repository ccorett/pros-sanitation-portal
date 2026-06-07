-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "policies" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "policies" ADD COLUMN "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE';
