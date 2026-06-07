-- CreateEnum
CREATE TYPE "DeliveryPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DeliveryRequestStatus" AS ENUM (
  'PENDING',
  'ASSIGNED',
  'IN_TRANSIT',
  'FULFILLED',
  'CANCELLED',
  'CANNOT_FULFIL'
);

-- CreateTable
CREATE TABLE "delivery_requests" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "status" "DeliveryRequestStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "DeliveryPriority" NOT NULL DEFAULT 'NORMAL',
  "requestedById" UUID NOT NULL,
  "requestedByName" TEXT NOT NULL,
  "requestedByEmail" TEXT NOT NULL,
  "requestingLocation" TEXT NOT NULL,
  "responsibleSupervisorId" UUID,
  "responsibleSupervisorName" TEXT,
  "assignedDriverId" UUID,
  "assignedDriverName" TEXT,
  "requestedDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "equipmentRequestId" TEXT,
  "createdById" UUID NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_request_items" (
  "id" TEXT NOT NULL,
  "deliveryRequestId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "inventoryItemId" TEXT,

  CONSTRAINT "delivery_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_status_history" (
  "id" TEXT NOT NULL,
  "deliveryRequestId" TEXT NOT NULL,
  "previousStatus" "DeliveryRequestStatus",
  "newStatus" "DeliveryRequestStatus" NOT NULL,
  "changedById" UUID NOT NULL,
  "changedByName" TEXT NOT NULL,
  "notes" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_requests_requestNumber_key" ON "delivery_requests"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_requests_equipmentRequestId_key" ON "delivery_requests"("equipmentRequestId");

-- CreateIndex
CREATE INDEX "delivery_requests_status_idx" ON "delivery_requests"("status");

-- CreateIndex
CREATE INDEX "delivery_requests_assignedDriverId_idx" ON "delivery_requests"("assignedDriverId");

-- CreateIndex
CREATE INDEX "delivery_requests_requestedDate_idx" ON "delivery_requests"("requestedDate");

-- CreateIndex
CREATE INDEX "delivery_requests_createdAt_idx" ON "delivery_requests"("createdAt");

-- CreateIndex
CREATE INDEX "delivery_request_items_deliveryRequestId_idx" ON "delivery_request_items"("deliveryRequestId");

-- CreateIndex
CREATE INDEX "delivery_status_history_deliveryRequestId_idx" ON "delivery_status_history"("deliveryRequestId");

-- CreateIndex
CREATE INDEX "delivery_status_history_changedAt_idx" ON "delivery_status_history"("changedAt");

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_equipmentRequestId_fkey" FOREIGN KEY ("equipmentRequestId") REFERENCES "equipment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_request_items" ADD CONSTRAINT "delivery_request_items_deliveryRequestId_fkey" FOREIGN KEY ("deliveryRequestId") REFERENCES "delivery_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_deliveryRequestId_fkey" FOREIGN KEY ("deliveryRequestId") REFERENCES "delivery_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
