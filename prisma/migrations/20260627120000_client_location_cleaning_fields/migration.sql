-- Add cleaning-location fields to client_locations
ALTER TABLE "client_locations" ADD COLUMN "slug" TEXT;
ALTER TABLE "client_locations" ADD COLUMN "locationName" TEXT;
ALTER TABLE "client_locations" ADD COLUMN "serviceType" TEXT;
ALTER TABLE "client_locations" ADD COLUMN "area" TEXT NOT NULL DEFAULT '';
ALTER TABLE "client_locations" ADD COLUMN "assignedTechnician" TEXT NOT NULL DEFAULT '';
ALTER TABLE "client_locations" ADD COLUMN "serviceDay" TEXT NOT NULL DEFAULT '';
ALTER TABLE "client_locations" ADD COLUMN "lastServiceDate" DATE;
ALTER TABLE "client_locations" ADD COLUMN "nextServiceDate" DATE;
ALTER TABLE "client_locations" ADD COLUMN "notes" TEXT;

UPDATE "client_locations"
SET
  "slug" = 'harbourview-commercial-plaza',
  "locationName" = COALESCE("siteName", "clientName"),
  "serviceType" = NULL
WHERE "slug" IS NULL;

ALTER TABLE "client_locations" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "client_locations" ALTER COLUMN "locationName" SET NOT NULL;

CREATE UNIQUE INDEX "client_locations_slug_key" ON "client_locations"("slug");
CREATE INDEX "client_locations_status_idx" ON "client_locations"("status");
