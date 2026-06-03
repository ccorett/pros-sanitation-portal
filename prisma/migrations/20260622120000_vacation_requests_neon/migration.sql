-- CreateEnum
CREATE TYPE "VacationSupervisorStatus" AS ENUM ('PENDING', 'AWARE', 'UNAWARE');

-- CreateEnum
CREATE TYPE "VacationManagerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VacationFinalStatus" AS ENUM ('PENDING_SUPERVISOR_REVIEW', 'PENDING_MANAGER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "vacation_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "locationAssignment" TEXT NOT NULL,
    "supervisorId" TEXT,
    "supervisorName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "supervisorStatus" "VacationSupervisorStatus" NOT NULL DEFAULT 'PENDING',
    "supervisorNotes" TEXT,
    "supervisorReviewedAt" TIMESTAMP(3),
    "managerStatus" "VacationManagerStatus" NOT NULL DEFAULT 'PENDING',
    "managerNotes" TEXT,
    "managerReviewedById" TEXT,
    "managerReviewedByName" TEXT,
    "managerReviewedAt" TIMESTAMP(3),
    "finalStatus" "VacationFinalStatus" NOT NULL DEFAULT 'PENDING_SUPERVISOR_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vacation_requests_employeeId_idx" ON "vacation_requests"("employeeId");

-- CreateIndex
CREATE INDEX "vacation_requests_locationAssignment_idx" ON "vacation_requests"("locationAssignment");

-- CreateIndex
CREATE INDEX "vacation_requests_supervisorId_idx" ON "vacation_requests"("supervisorId");

-- CreateIndex
CREATE INDEX "vacation_requests_finalStatus_idx" ON "vacation_requests"("finalStatus");

-- CreateIndex
CREATE INDEX "vacation_requests_createdAt_idx" ON "vacation_requests"("createdAt");
