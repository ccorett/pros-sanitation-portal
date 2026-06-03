-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "purchasingExcludedFromList" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_items" ADD COLUMN "purchasingOrderedAt" TIMESTAMP(3);
