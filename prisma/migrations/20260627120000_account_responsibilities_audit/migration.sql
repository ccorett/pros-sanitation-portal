-- CreateEnum
CREATE TYPE "EmployeeResponsibility" AS ENUM (
  'GENERAL_OPERATIONS',
  'BIN_TECHNICIAN',
  'BIN_SERVICE_SUPERVISOR',
  'DRIVER',
  'DELIVERY_COORDINATOR',
  'STOCK_ACCESS',
  'HR_REVIEW',
  'ADMIN_SUPPORT'
);

-- CreateEnum
CREATE TYPE "AccountAuditAction" AS ENUM (
  'ACCESS_LEVEL_CHANGED',
  'RESPONSIBILITIES_CHANGED',
  'ACCOUNT_DISABLED',
  'ACCOUNT_REMOVED'
);

-- CreateTable
CREATE TABLE "employee_responsibilities" (
  "id" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "responsibility" "EmployeeResponsibility" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_audit_logs" (
  "id" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "action" "AccountAuditAction" NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "changedBy" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,

  CONSTRAINT "account_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_responsibilities_employeeId_idx" ON "employee_responsibilities"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_responsibilities_employeeId_responsibility_key" ON "employee_responsibilities"("employeeId", "responsibility");

-- CreateIndex
CREATE INDEX "account_audit_logs_employeeId_idx" ON "account_audit_logs"("employeeId");

-- CreateIndex
CREATE INDEX "account_audit_logs_changedAt_idx" ON "account_audit_logs"("changedAt");

-- AddForeignKey
ALTER TABLE "employee_responsibilities" ADD CONSTRAINT "employee_responsibilities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_audit_logs" ADD CONSTRAINT "account_audit_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill responsibilities from operationalGroup
INSERT INTO "employee_responsibilities" ("id", "employeeId", "responsibility")
SELECT gen_random_uuid(), "id", 'BIN_SERVICE_SUPERVISOR'::"EmployeeResponsibility"
FROM "employees"
WHERE "operationalGroup" = 'BIN_SERVICE_SUPERVISOR'
ON CONFLICT ("employeeId", "responsibility") DO NOTHING;

INSERT INTO "employee_responsibilities" ("id", "employeeId", "responsibility")
SELECT gen_random_uuid(), "id", 'BIN_TECHNICIAN'::"EmployeeResponsibility"
FROM "employees"
WHERE "operationalGroup" = 'BIN_TECHNICIAN'
ON CONFLICT ("employeeId", "responsibility") DO NOTHING;

INSERT INTO "employee_responsibilities" ("id", "employeeId", "responsibility")
SELECT gen_random_uuid(), "id", 'GENERAL_OPERATIONS'::"EmployeeResponsibility"
FROM "employees"
WHERE "operationalGroup" = 'GENERAL'
ON CONFLICT ("employeeId", "responsibility") DO NOTHING;

INSERT INTO "employee_responsibilities" ("id", "employeeId", "responsibility")
SELECT gen_random_uuid(), "id", 'GENERAL_OPERATIONS'::"EmployeeResponsibility"
FROM "employees"
WHERE "operationalGroup" IN ('BIN_TECHNICIAN', 'BIN_SERVICE_SUPERVISOR')
ON CONFLICT ("employeeId", "responsibility") DO NOTHING;
