-- CreateEnum
CREATE TYPE "InvoiceNotificationType" AS ENUM ('DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'GENERATED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "InvoiceNotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "InvoiceNotificationAuditAction" AS ENUM ('NOTIFICATION_CREATED', 'NOTIFICATION_READ', 'NOTIFICATION_UNREAD');

-- CreateTable
CREATE TABLE "invoice_notifications" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "type" "InvoiceNotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InvoiceNotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "invoice_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_notification_audit_logs" (
    "id" UUID NOT NULL,
    "notificationId" UUID,
    "clientId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "action" "InvoiceNotificationAuditAction" NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_notification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_notifications_clientId_idx" ON "invoice_notifications"("clientId");

-- CreateIndex
CREATE INDEX "invoice_notifications_invoiceId_idx" ON "invoice_notifications"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_notifications_status_idx" ON "invoice_notifications"("status");

-- CreateIndex
CREATE INDEX "invoice_notifications_type_idx" ON "invoice_notifications"("type");

-- CreateIndex
CREATE INDEX "invoice_notifications_createdAt_idx" ON "invoice_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "invoice_notification_audit_logs_notificationId_idx" ON "invoice_notification_audit_logs"("notificationId");

-- CreateIndex
CREATE INDEX "invoice_notification_audit_logs_invoiceId_idx" ON "invoice_notification_audit_logs"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_notification_audit_logs_clientId_idx" ON "invoice_notification_audit_logs"("clientId");

-- CreateIndex
CREATE INDEX "invoice_notification_audit_logs_createdAt_idx" ON "invoice_notification_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "invoice_notifications" ADD CONSTRAINT "invoice_notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "invoice_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_notifications" ADD CONSTRAINT "invoice_notifications_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
