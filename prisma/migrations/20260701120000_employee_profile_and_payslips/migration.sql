-- Employee profile fields for Neon-backed My Profile
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "profilePictureUrl" TEXT;

-- Payslip archive (distinct from payslip_requests workflow)
CREATE TABLE "employee_payslips" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_payslips_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_payslips_employeeId_idx" ON "employee_payslips"("employeeId");
CREATE INDEX "employee_payslips_uploadedAt_idx" ON "employee_payslips"("uploadedAt");

ALTER TABLE "employee_payslips" ADD CONSTRAINT "employee_payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
