-- CreateEnum
CREATE TYPE "RequestUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EquipmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "equipment_requests" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "quantityRequested" INT NOT NULL,
    "reason" TEXT NOT NULL,
    "urgency" "RequestUrgency" NOT NULL,
    "status" "EquipmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_requests_inventoryItemId_idx" ON "equipment_requests"("inventoryItemId");

-- CreateIndex
CREATE INDEX "equipment_requests_requestedById_idx" ON "equipment_requests"("requestedById");

-- CreateIndex
CREATE INDEX "equipment_requests_status_idx" ON "equipment_requests"("status");

-- CreateIndex
CREATE INDEX "equipment_requests_createdAt_idx" ON "equipment_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "equipment_requests" ADD CONSTRAINT "equipment_requests_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
