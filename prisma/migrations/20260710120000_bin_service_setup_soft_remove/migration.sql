-- AlterTable
ALTER TABLE "bin_service_setups" ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "removedBy" TEXT;
