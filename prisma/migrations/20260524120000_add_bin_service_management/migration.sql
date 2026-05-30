-- CreateEnum
CREATE TYPE "BinWeekPattern" AS ENUM ('WEEK_1_3', 'WEEK_2_4');

-- CreateEnum
CREATE TYPE "ServiceDayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "BinServiceJobStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANNOT_ACCESS', 'ISSUE_REPORTED');

-- CreateEnum
CREATE TYPE "BinServiceLogOutcome" AS ENUM ('COMPLETED', 'CANNOT_ACCESS', 'ISSUE_REPORTED');

-- CreateTable
CREATE TABLE "bin_clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_service_sites" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_service_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_service_setups" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "expectedRegularBins" INTEGER NOT NULL DEFAULT 0,
    "expectedNewBins" INTEGER NOT NULL DEFAULT 0,
    "weekPattern" "BinWeekPattern" NOT NULL,
    "serviceDay" "ServiceDayOfWeek" NOT NULL,
    "assignedTechnicianId" UUID,
    "accessInstructions" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCompletedServiceDate" DATE,
    "nextServiceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_service_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_service_jobs" (
    "id" UUID NOT NULL,
    "setupId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "assignedTechnicianId" UUID NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "status" "BinServiceJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_service_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_service_logs" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "technicianId" UUID NOT NULL,
    "regularBinsExpected" INTEGER NOT NULL,
    "regularBinsServiced" INTEGER NOT NULL,
    "newBinsExpected" INTEGER NOT NULL,
    "newBinsServiced" INTEGER NOT NULL,
    "linersUsed" INTEGER NOT NULL,
    "issueType" TEXT,
    "issueNotes" TEXT,
    "clientSignatureName" TEXT,
    "noSignatureReason" TEXT,
    "outcome" "BinServiceLogOutcome" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bin_service_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bin_service_sites_clientId_idx" ON "bin_service_sites"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "bin_service_setups_siteId_key" ON "bin_service_setups"("siteId");

-- CreateIndex
CREATE INDEX "bin_service_setups_assignedTechnicianId_idx" ON "bin_service_setups"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "bin_service_setups_nextServiceDate_idx" ON "bin_service_setups"("nextServiceDate");

-- CreateIndex
CREATE INDEX "bin_service_jobs_assignedTechnicianId_scheduledDate_idx" ON "bin_service_jobs"("assignedTechnicianId", "scheduledDate");

-- CreateIndex
CREATE INDEX "bin_service_jobs_siteId_idx" ON "bin_service_jobs"("siteId");

-- CreateIndex
CREATE INDEX "bin_service_jobs_status_idx" ON "bin_service_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bin_service_jobs_setupId_scheduledDate_key" ON "bin_service_jobs"("setupId", "scheduledDate");

-- CreateIndex
CREATE INDEX "bin_service_logs_jobId_idx" ON "bin_service_logs"("jobId");

-- CreateIndex
CREATE INDEX "bin_service_logs_siteId_idx" ON "bin_service_logs"("siteId");

-- CreateIndex
CREATE INDEX "bin_service_logs_technicianId_idx" ON "bin_service_logs"("technicianId");

-- CreateIndex
CREATE INDEX "bin_service_logs_completedAt_idx" ON "bin_service_logs"("completedAt");

-- AddForeignKey
ALTER TABLE "bin_service_sites" ADD CONSTRAINT "bin_service_sites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "bin_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_setups" ADD CONSTRAINT "bin_service_setups_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "bin_service_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_setups" ADD CONSTRAINT "bin_service_setups_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_jobs" ADD CONSTRAINT "bin_service_jobs_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "bin_service_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_jobs" ADD CONSTRAINT "bin_service_jobs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "bin_service_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_jobs" ADD CONSTRAINT "bin_service_jobs_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_logs" ADD CONSTRAINT "bin_service_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "bin_service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_logs" ADD CONSTRAINT "bin_service_logs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "bin_service_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_service_logs" ADD CONSTRAINT "bin_service_logs_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
