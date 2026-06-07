CREATE TABLE "payslip_import_logs" (
    "id" UUID NOT NULL,
    "importedById" UUID,
    "importedByName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "recordsImported" INTEGER NOT NULL,
    "recordsUpdated" INTEGER NOT NULL,
    "recordsSkipped" INTEGER NOT NULL,
    "unmatchedEmployees" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "payslip_import_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payslip_import_logs_importedAt_idx" ON "payslip_import_logs"("importedAt");
