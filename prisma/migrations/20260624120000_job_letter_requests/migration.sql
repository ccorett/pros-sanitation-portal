-- CreateEnum
CREATE TYPE "JobLetterType" AS ENUM ('JOB_LETTER', 'EMPLOYMENT_LETTER', 'SALARY_LETTER');

-- CreateEnum
CREATE TYPE "JobLetterRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "job_letter_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "letterType" "JobLetterType" NOT NULL,
    "notes" TEXT,
    "status" "JobLetterRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_letter_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_letter_requests_employeeId_idx" ON "job_letter_requests"("employeeId");

-- CreateIndex
CREATE INDEX "job_letter_requests_status_idx" ON "job_letter_requests"("status");

-- CreateIndex
CREATE INDEX "job_letter_requests_createdAt_idx" ON "job_letter_requests"("createdAt");
