-- Replace legacy jobs table with cleaning job management schema
DROP TABLE IF EXISTS "jobs";

DROP TYPE IF EXISTS "JobStatus";
DROP TYPE IF EXISTS "ServiceType";

CREATE TYPE "CleaningJobStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "clientLocationId" UUID NOT NULL,
    "clientLocation" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "assignedEmployeeId" UUID,
    "assignedEmployeeName" TEXT,
    "assignedEmployeeEmail" TEXT,
    "assignedBy" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "CleaningJobStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jobs_assignedEmployeeId_idx" ON "jobs"("assignedEmployeeId");
CREATE INDEX "jobs_clientLocationId_idx" ON "jobs"("clientLocationId");
CREATE INDEX "jobs_scheduledDate_idx" ON "jobs"("scheduledDate");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientLocationId_fkey" FOREIGN KEY ("clientLocationId") REFERENCES "client_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
