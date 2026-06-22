-- AlterTable
ALTER TABLE "session" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "session_lastActivityAt_idx" ON "session"("lastActivityAt");
