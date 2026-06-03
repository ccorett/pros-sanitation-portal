-- CreateEnum
CREATE TYPE "PayslipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "payslip_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PayslipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslip_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslip_requests_employeeId_idx" ON "payslip_requests"("employeeId");

-- CreateIndex
CREATE INDEX "payslip_requests_status_idx" ON "payslip_requests"("status");

-- CreateIndex
CREATE INDEX "payslip_requests_createdAt_idx" ON "payslip_requests"("createdAt");
