-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'SICK', 'VACATION');

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" UUID NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "location" TEXT NOT NULL,
    "supervisorId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_logs_attendanceDate_idx" ON "attendance_logs"("attendanceDate");

-- CreateIndex
CREATE INDEX "attendance_logs_location_idx" ON "attendance_logs"("location");

-- CreateIndex
CREATE INDEX "attendance_logs_supervisorId_idx" ON "attendance_logs"("supervisorId");

-- CreateIndex
CREATE INDEX "attendance_logs_employeeId_idx" ON "attendance_logs"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_attendanceDate_employeeId_location_key" ON "attendance_logs"("attendanceDate", "employeeId", "location");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
