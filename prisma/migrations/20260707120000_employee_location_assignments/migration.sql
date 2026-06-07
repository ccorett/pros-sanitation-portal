-- CreateTable
CREATE TABLE "employee_location_assignments" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "locationName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_location_assignments_employeeId_locationName_key" ON "employee_location_assignments"("employeeId", "locationName");

-- CreateIndex
CREATE INDEX "employee_location_assignments_employeeId_isActive_idx" ON "employee_location_assignments"("employeeId", "isActive");

-- AddForeignKey
ALTER TABLE "employee_location_assignments" ADD CONSTRAINT "employee_location_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill primary location from legacy employee.locationAssignment
INSERT INTO "employee_location_assignments" (
    "id",
    "employeeId",
    "locationName",
    "isPrimary",
    "assignedBy",
    "assignedAt",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    e."id",
    trim(e."locationAssignment"),
    true,
    COALESCE(NULLIF(trim(e."editedBy"), ''), 'Migration'),
    COALESCE(e."lastEditedAt", e."updatedAt", CURRENT_TIMESTAMP),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "employees" e
WHERE e."locationAssignment" IS NOT NULL
  AND trim(e."locationAssignment") <> ''
ON CONFLICT ("employeeId", "locationName") DO NOTHING;
