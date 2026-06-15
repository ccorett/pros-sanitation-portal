-- AlterEnum
ALTER TYPE "EmployeeResponsibility" ADD VALUE 'ADMIN_ASSISTANT';

-- CreateEnum
CREATE TYPE "InvoiceBillingCycle" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "InvoiceClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvoiceScheduleStatus" AS ENUM ('UPCOMING', 'DUE_SOON', 'DUE', 'GENERATED', 'SUBMITTED', 'SNOOZED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InvoiceAlertType" AS ENUM ('INVOICE_REMINDER');

-- CreateEnum
CREATE TYPE "InvoiceAlertLogType" AS ENUM ('FIVE_DAY_REMINDER', 'DUE_DATE_REMINDER');

-- CreateEnum
CREATE TYPE "InvoiceAlertLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "invoice_clients" (
    "id" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "billingCycle" "InvoiceBillingCycle" NOT NULL,
    "invoiceCountPerCycle" INTEGER NOT NULL DEFAULT 1,
    "usualDueDay" INTEGER NOT NULL DEFAULT 1,
    "status" "InvoiceClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_schedules" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "cycleMonth" INTEGER NOT NULL,
    "cycleYear" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "reminderDate" DATE NOT NULL,
    "status" "InvoiceScheduleStatus" NOT NULL DEFAULT 'UPCOMING',
    "generatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "snoozedUntil" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_alert_recipients" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertType" "InvoiceAlertType" NOT NULL DEFAULT 'INVOICE_REMINDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_alert_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_alert_logs" (
    "id" UUID NOT NULL,
    "alertDate" DATE NOT NULL,
    "alertType" "InvoiceAlertLogType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "invoiceCount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "InvoiceAlertLogStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_clients_status_idx" ON "invoice_clients"("status");

-- CreateIndex
CREATE INDEX "invoice_schedules_dueDate_idx" ON "invoice_schedules"("dueDate");

-- CreateIndex
CREATE INDEX "invoice_schedules_status_idx" ON "invoice_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_schedules_clientId_cycleMonth_cycleYear_key" ON "invoice_schedules"("clientId", "cycleMonth", "cycleYear");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_alert_recipients_email_alertType_key" ON "invoice_alert_recipients"("email", "alertType");

-- CreateIndex
CREATE INDEX "invoice_alert_logs_alertDate_idx" ON "invoice_alert_logs"("alertDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_alert_logs_alertDate_alertType_recipientEmail_key" ON "invoice_alert_logs"("alertDate", "alertType", "recipientEmail");

-- AddForeignKey
ALTER TABLE "invoice_schedules" ADD CONSTRAINT "invoice_schedules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "invoice_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
