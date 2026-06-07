-- Google Sheet payslip sync fields
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "employeeEmail" TEXT;
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "grossPay" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "healthSurcharge" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "nis" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "paye" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "companyDeductions" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "netPay" DECIMAL(12, 2);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "grossPayDetails" TEXT;
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "companyDeductionDetails" TEXT;
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employee_payslips" ADD COLUMN IF NOT EXISTS "source" TEXT;

ALTER TABLE "employee_payslips" ALTER COLUMN "fileName" DROP NOT NULL;
ALTER TABLE "employee_payslips" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "employee_payslips" ALTER COLUMN "uploadedBy" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "employee_payslips_employeeId_payPeriod_key"
  ON "employee_payslips"("employeeId", "payPeriod");

CREATE INDEX IF NOT EXISTS "employee_payslips_payPeriod_idx" ON "employee_payslips"("payPeriod");
CREATE INDEX IF NOT EXISTS "employee_payslips_archived_idx" ON "employee_payslips"("archived");
CREATE INDEX IF NOT EXISTS "employee_payslips_importedAt_idx" ON "employee_payslips"("importedAt");
