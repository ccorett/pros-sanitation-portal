-- CreateEnum
CREATE TYPE "InvoiceServiceType" AS ENUM ('CLEANING_SERVICES', 'BIN_SERVICES', 'OTHER');

-- AlterTable
ALTER TABLE "invoice_clients" ADD COLUMN "serviceType" "InvoiceServiceType" NOT NULL DEFAULT 'CLEANING_SERVICES';

-- CreateIndex
CREATE INDEX "invoice_clients_clientName_serviceType_billingCycle_idx" ON "invoice_clients"("clientName", "serviceType", "billingCycle");

-- Partial unique: Client Name + Service Type + Billing Cycle (excluding soft-removed)
CREATE UNIQUE INDEX "invoice_clients_active_client_service_cycle_key"
ON "invoice_clients"("clientName", "serviceType", "billingCycle")
WHERE "status" <> 'REMOVED';
