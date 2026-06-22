ALTER TYPE "SecurityAuditEventType" ADD VALUE 'UNAUTHORIZED_ROUTE_ACCESS';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'UNAUTHORIZED_API_ACCESS';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'ACCOUNT_REMOVED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'ACCOUNT_RESTORED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'ACCOUNT_PURGED';

ALTER TABLE "security_audit_logs" ADD COLUMN "accessLevel" "PortalAccessLevel";
ALTER TABLE "security_audit_logs" ADD COLUMN "result" TEXT;

ALTER TABLE "attendance_logs" ADD COLUMN "employeeDisplayName" TEXT;
ALTER TABLE "attendance_logs" ADD COLUMN "supervisorDisplayName" TEXT;
ALTER TABLE "attendance_logs" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "attendance_logs" ALTER COLUMN "supervisorId" DROP NOT NULL;

ALTER TABLE "bin_service_logs" ADD COLUMN "technicianDisplayName" TEXT;
ALTER TABLE "bin_service_logs" ALTER COLUMN "technicianId" DROP NOT NULL;
