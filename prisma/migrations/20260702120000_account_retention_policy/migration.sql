-- Account retention: soft-delete metadata, restore audit action, retain historical logs after purge

ALTER TYPE "AccountAuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_RESTORED';

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduledPurgeAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restoreSnapshot" JSONB;

ALTER TABLE "account_audit_logs"
  ADD COLUMN IF NOT EXISTS "employeeName" TEXT;

UPDATE "account_audit_logs" AS log
SET "employeeName" = TRIM(CONCAT(employee."firstName", ' ', employee."lastName"))
FROM "employees" AS employee
WHERE log."employeeId" = employee."id"
  AND (log."employeeName" IS NULL OR log."employeeName" = '');

UPDATE "account_audit_logs"
SET "employeeName" = 'Former Employee'
WHERE "employeeName" IS NULL OR "employeeName" = '';

ALTER TABLE "account_audit_logs"
  ALTER COLUMN "employeeName" SET NOT NULL;

ALTER TABLE "account_audit_logs" DROP CONSTRAINT IF EXISTS "account_audit_logs_employeeId_fkey";
ALTER TABLE "account_audit_logs" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "account_audit_logs"
  ADD CONSTRAINT "account_audit_logs_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_service_logs" DROP CONSTRAINT IF EXISTS "job_service_logs_employeeId_fkey";
ALTER TABLE "job_service_logs" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "job_service_logs"
  ADD CONSTRAINT "job_service_logs_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_payslips"
  ADD COLUMN IF NOT EXISTS "employeeName" TEXT;

UPDATE "employee_payslips" AS payslip
SET "employeeName" = TRIM(CONCAT(employee."firstName", ' ', employee."lastName"))
FROM "employees" AS employee
WHERE payslip."employeeId" = employee."id"
  AND (payslip."employeeName" IS NULL OR payslip."employeeName" = '');

UPDATE "employee_payslips"
SET "employeeName" = 'Former Employee'
WHERE "employeeName" IS NULL OR "employeeName" = '';

ALTER TABLE "employee_payslips"
  ALTER COLUMN "employeeName" SET NOT NULL;

ALTER TABLE "employee_payslips" DROP CONSTRAINT IF EXISTS "employee_payslips_employeeId_fkey";
ALTER TABLE "employee_payslips" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "employee_payslips"
  ADD CONSTRAINT "employee_payslips_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "employees_scheduledPurgeAt_idx" ON "employees"("scheduledPurgeAt");
