-- Replace account lockout with progressive delay tracking by email + IP

DROP TABLE IF EXISTS "login_attempts";

CREATE TABLE "login_attempts" (
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("email","ipAddress")
);

ALTER TYPE "SecurityAuditEventType" ADD VALUE 'LOGIN_DELAY_APPLIED';
