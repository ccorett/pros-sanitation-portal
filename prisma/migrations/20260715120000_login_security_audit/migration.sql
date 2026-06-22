-- Login lockout window + IP tracking on account attempts
ALTER TABLE "login_attempts" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "login_attempts" ADD COLUMN "lastIp" TEXT;

-- Per-IP login rate limiting
CREATE TABLE "login_ip_rate_limits" (
    "ipAddress" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_ip_rate_limits_pkey" PRIMARY KEY ("ipAddress")
);

-- Security audit trail for authentication events
CREATE TYPE "SecurityAuditEventType" AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'ACCOUNT_LOCKOUT',
    'PASSWORD_RESET',
    'SESSION_EXPIRED',
    'IP_RATE_LIMITED'
);

CREATE TABLE "security_audit_logs" (
    "id" UUID NOT NULL,
    "eventType" "SecurityAuditEventType" NOT NULL,
    "email" TEXT,
    "ipAddress" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_audit_logs_eventType_createdAt_idx" ON "security_audit_logs"("eventType", "createdAt");
CREATE INDEX "security_audit_logs_email_createdAt_idx" ON "security_audit_logs"("email", "createdAt");
CREATE INDEX "security_audit_logs_ipAddress_createdAt_idx" ON "security_audit_logs"("ipAddress", "createdAt");

ALTER TYPE "InvoiceAlertLogType" ADD VALUE 'OVERDUE_REMINDER';
