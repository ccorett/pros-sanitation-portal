import { config } from "dotenv";
import { resolve } from "path";
import {
  getProgressiveDelayMs,
  INVALID_CREDENTIALS_MESSAGE,
  IP_RATE_LIMIT_MESSAGE,
  IP_RATE_LIMIT_WINDOW_MS,
  MAX_IP_ATTEMPTS,
  PROGRESSIVE_DELAY_ATTEMPT_6_MS,
  PROGRESSIVE_DELAY_ATTEMPT_7_MS,
  PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS,
  recordLoginFailure,
  resetLoginAttempts,
} from "../src/lib/login-security";
import { SESSION_INACTIVITY_MS } from "../src/lib/session-inactivity";
import { SecurityAuditEventType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const TEST_EMAIL = "login-security-test@prossanitation.com";
const TEST_IP_A = "203.0.113.50";
const TEST_IP_B = "203.0.113.51";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assert(
    getProgressiveDelayMs(1) === 0,
    "Attempts 1–5 should have no delay.",
  );
  assert(getProgressiveDelayMs(5) === 0, "Attempt 5 should have no delay.");
  assert(
    getProgressiveDelayMs(6) === PROGRESSIVE_DELAY_ATTEMPT_6_MS,
    "Attempt 6 should delay 30 seconds.",
  );
  assert(
    getProgressiveDelayMs(7) === PROGRESSIVE_DELAY_ATTEMPT_7_MS,
    "Attempt 7 should delay 60 seconds.",
  );
  assert(
    getProgressiveDelayMs(8) === PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS,
    "Attempt 8 should delay 5 minutes.",
  );
  assert(
    getProgressiveDelayMs(20) === PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS,
    "Attempt 8+ should delay 5 minutes.",
  );
  assert(MAX_IP_ATTEMPTS === 10, "IP rate limit should be 10 attempts.");
  assert(
    IP_RATE_LIMIT_WINDOW_MS === 15 * 60 * 1000,
    "IP rate limit window should be 15 minutes.",
  );
  assert(
    SESSION_INACTIVITY_MS === 30 * 60 * 1000,
    "Session inactivity timeout should be 30 minutes.",
  );
  assert(
    INVALID_CREDENTIALS_MESSAGE === "Invalid credentials.",
    "Generic invalid credentials message required.",
  );
  assert(
    IP_RATE_LIMIT_MESSAGE ===
      "Too many login attempts. Please try again later.",
    "IP rate limit message required.",
  );

  await prisma.loginAttempt.deleteMany({
    where: { email: TEST_EMAIL },
  });
  await prisma.loginIpRateLimit.deleteMany({
    where: { ipAddress: { in: [TEST_IP_A, TEST_IP_B] } },
  });
  await prisma.securityAuditLog.deleteMany({ where: { email: TEST_EMAIL } });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const started = Date.now();
    const result = await recordLoginFailure({
      email: TEST_EMAIL,
      ipAddress: TEST_IP_A,
    });
    const elapsed = Date.now() - started;

    assert(!result.rateLimited, `Attempt ${attempt} should not be IP limited.`);
    assert(result.delayMs === 0, `Attempt ${attempt} should have no delay.`);
    assert(
      result.message === INVALID_CREDENTIALS_MESSAGE,
      `Attempt ${attempt} should return generic credentials message.`,
    );
    assert(elapsed < 2000, `Attempt ${attempt} should not wait on delay.`);
    assert(
      result.attemptCount === attempt,
      `Attempt ${attempt} should track count on email+IP pair.`,
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
  }

  const attempt6Started = Date.now();
  const attempt6 = await recordLoginFailure({
    email: TEST_EMAIL,
    ipAddress: TEST_IP_A,
  });
  const attempt6Elapsed = Date.now() - attempt6Started;

  assert(attempt6.delayMs === PROGRESSIVE_DELAY_ATTEMPT_6_MS, "Attempt 6 delay ms.");
  assert(
    attempt6Elapsed >= PROGRESSIVE_DELAY_ATTEMPT_6_MS - 500,
    "Attempt 6 should wait ~30 seconds.",
  );
  assert(attempt6.attemptCount === 6, "Attempt 6 count.");

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));

  const attempt7Started = Date.now();
  const attempt7 = await recordLoginFailure({
    email: TEST_EMAIL,
    ipAddress: TEST_IP_A,
  });
  const attempt7Elapsed = Date.now() - attempt7Started;

  assert(attempt7.delayMs === PROGRESSIVE_DELAY_ATTEMPT_7_MS, "Attempt 7 delay ms.");
  assert(
    attempt7Elapsed >= PROGRESSIVE_DELAY_ATTEMPT_7_MS - 500,
    "Attempt 7 should wait ~60 seconds.",
  );

  const delayLogs = await prisma.securityAuditLog.count({
    where: {
      email: TEST_EMAIL,
      eventType: SecurityAuditEventType.LOGIN_DELAY_APPLIED,
    },
  });
  assert(delayLogs >= 2, "Progressive delays should be audited.");

  const lockoutLogs = await prisma.securityAuditLog.count({
    where: {
      email: TEST_EMAIL,
      eventType: SecurityAuditEventType.ACCOUNT_LOCKOUT,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  assert(lockoutLogs === 0, "Account lockout events must not be emitted.");

  const otherIpResult = await recordLoginFailure({
    email: TEST_EMAIL,
    ipAddress: TEST_IP_B,
  });
  assert(
    otherIpResult.attemptCount === 1,
    "Different IP should track separately from attempt 1.",
  );
  assert(otherIpResult.delayMs === 0, "Different IP should start with no delay.");

  await resetLoginAttempts({ email: TEST_EMAIL, ipAddress: TEST_IP_A });

  const resetRecord = await prisma.loginAttempt.findUnique({
    where: {
      email_ipAddress: { email: TEST_EMAIL, ipAddress: TEST_IP_A },
    },
  });
  assert(!resetRecord, "Successful reset should clear email+IP counters.");

  const ipBRecord = await prisma.loginAttempt.findUnique({
    where: {
      email_ipAddress: { email: TEST_EMAIL, ipAddress: TEST_IP_B },
    },
  });
  assert(
    ipBRecord?.attempts === 1,
    "Reset for one IP should not clear another IP's counters.",
  );

  const successLogs = await prisma.securityAuditLog.count({
    where: {
      email: TEST_EMAIL,
      eventType: SecurityAuditEventType.LOGIN_SUCCESS,
    },
  });
  assert(successLogs >= 1, "Successful login reset should be audited.");

  console.log("Login security checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
