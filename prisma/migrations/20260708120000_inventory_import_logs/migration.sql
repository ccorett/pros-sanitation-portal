CREATE TABLE "inventory_import_logs" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" UUID,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,

    CONSTRAINT "inventory_import_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_import_logs_importedAt_idx" ON "inventory_import_logs"("importedAt");
