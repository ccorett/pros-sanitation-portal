-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "editedBy" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "access_history" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "previousLevel" "PortalAccessLevel" NOT NULL,
    "newLevel" "PortalAccessLevel" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "access_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "access_history_employeeId_idx" ON "access_history"("employeeId");
CREATE INDEX IF NOT EXISTS "access_history_changedAt_idx" ON "access_history"("changedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'access_history_employeeId_fkey'
  ) THEN
    ALTER TABLE "access_history" ADD CONSTRAINT "access_history_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
