-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ClientLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SANITARY_BIN_SERVICE', 'GROCERY_CLEANING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ISSUE_REPORTED');

-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('GENERAL', 'SAFETY', 'OPERATIONS', 'HR');

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "department" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "supervisorName" TEXT,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_locations" (
    "id" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "siteName" TEXT,
    "address" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactNumber" TEXT,
    "status" "ClientLocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "jobCode" TEXT NOT NULL,
    "clientLocationId" UUID NOT NULL,
    "assignedEmployeeId" UUID NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "instructions" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completionNotes" TEXT,
    "issueNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notices" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NoticeCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acknowledgements" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_acknowledgements" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_clerkUserId_key" ON "employees"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeId_key" ON "employees"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyEmail_key" ON "employees"("companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobCode_key" ON "jobs"("jobCode");

-- CreateIndex
CREATE INDEX "jobs_assignedEmployeeId_idx" ON "jobs"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "jobs_clientLocationId_idx" ON "jobs"("clientLocationId");

-- CreateIndex
CREATE INDEX "jobs_scheduledDate_idx" ON "jobs"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acknowledgements_employeeId_policyId_key" ON "policy_acknowledgements"("employeeId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "notice_acknowledgements_employeeId_noticeId_key" ON "notice_acknowledgements"("employeeId", "noticeId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientLocationId_fkey" FOREIGN KEY ("clientLocationId") REFERENCES "client_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "internal_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
