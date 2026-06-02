import { prisma } from "@/lib/prisma";

export const LOGIN_LOCKOUT_MESSAGE =
  "Too many failed attempts. Please contact admin.";

const MAX_FAILED_ATTEMPTS = 3;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isLoginLocked(email: string): Promise<boolean> {
  const record = await prisma.loginAttempt.findUnique({
    where: { email: normalizeEmail(email) },
  });
  return (record?.attempts ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginFailure(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const record = await prisma.loginAttempt.upsert({
    where: { email: normalized },
    create: { email: normalized, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });

  return record.attempts >= MAX_FAILED_ATTEMPTS;
}

export async function resetLoginAttempts(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await prisma.loginAttempt.deleteMany({
    where: { email: normalized },
  });
}
