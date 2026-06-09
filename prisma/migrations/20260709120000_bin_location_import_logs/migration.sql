-- CreateTable
CREATE TABLE "bin_location_import_logs" (
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

    CONSTRAINT "bin_location_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bin_location_import_logs_importedAt_idx" ON "bin_location_import_logs"("importedAt");
