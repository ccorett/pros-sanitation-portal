-- Align AccountStatus with portal account lifecycle (PENDING, ACTIVE, DISABLED, REMOVED).
CREATE TYPE "AccountStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'REMOVED');

ALTER TABLE "employees" ALTER COLUMN "accountStatus" DROP DEFAULT;

ALTER TABLE "employees"
ALTER COLUMN "accountStatus" TYPE "AccountStatus_new"
USING (
  CASE "accountStatus"::text
    WHEN 'LOCKED' THEN 'DISABLED'::"AccountStatus_new"
    WHEN 'DISABLED' THEN 'DISABLED'::"AccountStatus_new"
    WHEN 'ACTIVE' THEN 'ACTIVE'::"AccountStatus_new"
    ELSE 'ACTIVE'::"AccountStatus_new"
  END
);

DROP TYPE "AccountStatus";

ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";

ALTER TABLE "employees" ALTER COLUMN "accountStatus" SET DEFAULT 'PENDING';

UPDATE "employees"
SET "accountStatus" = 'PENDING'
WHERE "accessLevel" = 'PENDING_VERIFICATION'
  AND "accountStatus" = 'ACTIVE';
