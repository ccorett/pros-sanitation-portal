export {
  INVALID_CREDENTIALS_MESSAGE,
  IP_RATE_LIMIT_MESSAGE,
  normalizeLoginEmail as normalizeEmail,
  resetLoginAttempts as resetLoginAttemptsForEmail,
  assertLoginAllowed,
  isIpRateLimited,
  recordIpLoginAttempt,
  getProgressiveDelayMs,
  PROGRESSIVE_DELAY_ATTEMPT_6_MS,
  PROGRESSIVE_DELAY_ATTEMPT_7_MS,
  PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS,
  MAX_IP_ATTEMPTS,
  IP_RATE_LIMIT_WINDOW_MS,
} from "@/lib/login-security";

import {
  recordLoginFailure as recordLoginFailureInternal,
  resetLoginAttempts as resetLoginAttemptsInternal,
} from "@/lib/login-security";

export async function recordLoginFailure(
  email: string,
  ipAddress = "unknown",
) {
  return recordLoginFailureInternal({ email, ipAddress });
}

export async function resetLoginAttempts(
  email: string,
  ipAddress?: string | null,
) {
  return resetLoginAttemptsInternal({ email, ipAddress });
}
