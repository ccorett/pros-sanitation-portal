-- Job service activity logs and issue status for cleaning jobs
CREATE TYPE "JobActionType" AS ENUM ('STARTED', 'COMPLETED', 'ISSUE_REPORTED', 'CANCELLED');

ALTER TYPE "CleaningJobStatus" ADD VALUE 'ISSUE_REPORTED';

CREATE TABLE "job_service_logs" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "job" TEXT NOT NULL,
    "employeeId" UUID NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "actionType" "JobActionType" NOT NULL,
    "notes" TEXT,
    "issueNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_service_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_service_logs_jobId_idx" ON "job_service_logs"("jobId");
CREATE INDEX "job_service_logs_employeeId_idx" ON "job_service_logs"("employeeId");
CREATE INDEX "job_service_logs_createdAt_idx" ON "job_service_logs"("createdAt");

ALTER TABLE "job_service_logs" ADD CONSTRAINT "job_service_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_service_logs" ADD CONSTRAINT "job_service_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
