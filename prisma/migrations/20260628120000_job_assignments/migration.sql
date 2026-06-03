-- CreateTable
CREATE TABLE "job_assignments" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "clientLocationId" UUID NOT NULL,
    "clientLocation" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_assignments_employeeId_isActive_idx" ON "job_assignments"("employeeId", "isActive");

-- CreateIndex
CREATE INDEX "job_assignments_clientLocationId_idx" ON "job_assignments"("clientLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_employeeId_clientLocationId_key" ON "job_assignments"("employeeId", "clientLocationId");

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_clientLocationId_fkey" FOREIGN KEY ("clientLocationId") REFERENCES "client_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
