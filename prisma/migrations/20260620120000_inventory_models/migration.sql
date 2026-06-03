-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('EQUIPMENT', 'CHEMICALS', 'PPE', 'CONSUMABLES');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "storageArea" TEXT NOT NULL,
    "supplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3),
    "lastEditedBy" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_edit_history" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "previousReorderLevel" INTEGER,
    "newReorderLevel" INTEGER,
    "previousStorageArea" TEXT,
    "newStorageArea" TEXT,
    "previousSupplier" TEXT,
    "newSupplier" TEXT,
    "editedBy" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "stock_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_isActive_idx" ON "inventory_items"("isActive");

-- CreateIndex
CREATE INDEX "stock_edit_history_inventoryItemId_idx" ON "stock_edit_history"("inventoryItemId");

-- CreateIndex
CREATE INDEX "stock_edit_history_editedAt_idx" ON "stock_edit_history"("editedAt");

-- AddForeignKey
ALTER TABLE "stock_edit_history" ADD CONSTRAINT "stock_edit_history_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
