-- Manual invoice status email support
ALTER TYPE "InvoiceAlertLogType" ADD VALUE 'MANUAL_STATUS_UPDATE';

ALTER TABLE "invoice_alert_logs" ADD COLUMN "sentBy" TEXT;
